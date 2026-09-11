const STRICT_SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseStrictSemver(value) {
  const match = String(value || "").match(STRICT_SEMVER);
  if (!match) return null;
  return match.slice(1).map(Number);
}

export function compareVersions(a, b) {
  const left = parseStrictSemver(a);
  const right = parseStrictSemver(b);
  if (!left || !right) return null;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  }
  return 0;
}

export function classifyVersionChange(fromVersion, toVersion) {
  const from = parseStrictSemver(fromVersion);
  const to = parseStrictSemver(toVersion);
  if (!from || !to) return "invalid";
  const comparison = compareVersions(toVersion, fromVersion);
  if (comparison === 0) return "same";
  if (comparison < 0) return "rollback";
  if (to[0] !== from[0]) return "major";
  if (to[1] !== from[1]) return "minor";
  return "patch";
}

export function validatePromotionPolicy(policy, knownAppIds = []) {
  const errors = [];
  if (!policy || typeof policy !== "object") return ["promotion policy chybi nebo neni objekt."];
  if (policy.schema !== "ghrab-release-promotion-policy-v1") errors.push("promotion policy ma neplatne schema.");
  if (policy.mode !== "transitional") errors.push("promotion policy musi byt v transitional rezimu.");
  if (policy.atomic !== true) errors.push("promotion policy musi byt fail-closed a atomic=true.");
  if (policy.defaultMode !== "manual") errors.push("promotion policy musi mit defaultMode=manual.");
  if (!Array.isArray(policy.applications)) errors.push("promotion policy applications musi byt pole.");

  const known = new Set(knownAppIds);
  const seen = new Set();
  for (const entry of policy.applications || []) {
    if (!entry?.id || seen.has(entry.id)) {
      errors.push(`promotion policy: chybi nebo je duplicitni appId ${entry?.id || "?"}.`);
      continue;
    }
    seen.add(entry.id);
    if (known.size && !known.has(entry.id)) errors.push(`promotion policy: nezname appId ${entry.id}.`);
    if (entry.mode !== "auto-patch") errors.push(`${entry.id}: jediny podporovany automaticky rezim je auto-patch.`);
    if (!parseStrictSemver(entry.minimumVersion)) errors.push(`${entry.id}: minimumVersion neni stabilni SemVer.`);
    if (entry.assuranceBaseline !== "GARP-2.5.1-SHIELD-PREP") errors.push(`${entry.id}: chybi schvaleny GARP 2.5.1 SHIELD-PREP baseline.`);
    if (entry.requiredVerification !== "deployment") errors.push(`${entry.id}: auto-patch musi vyzadovat zive deployment overeni.`);
  }
  return errors;
}

export function promotionEntryById(policy) {
  return new Map((policy?.applications || []).map((entry) => [entry.id, entry]));
}

export function evaluateAutoPromotion({
  app,
  waveApp,
  source,
  sourceReport,
  policyEntry,
  wave,
  enabled,
}) {
  const fromVersion = waveApp?.version || null;
  const toVersion = app?.version || null;
  const base = {
    appId: app?.id || waveApp?.id || "unknown",
    fromVersion,
    toVersion,
    change: classifyVersionChange(fromVersion, toVersion),
    status: "BLOCKED",
    reasonCode: "UNKNOWN",
    reason: "Neznama chyba promotion kontroly.",
    assuranceBaseline: policyEntry?.assuranceBaseline || null,
    verification: sourceReport?.verification || null,
  };

  const blocked = (reasonCode, reason) => ({ ...base, reasonCode, reason });
  const eligible = () => ({
    ...base,
    status: "ELIGIBLE",
    reasonCode: "SAFE_PATCH_DEPLOYMENT",
    reason: "Vyssi patch verze je zive nasazena, zdrojove a platformne konzistentni a aplikace je zarazena do GARP 2.5.1 auto-patch politiky.",
  });

  if (base.change === "same") {
    return { ...base, status: "CURRENT", reasonCode: "NO_DRIFT", reason: "Verze odpovida release-wave baseline." };
  }
  if (!enabled) return blocked("AUTO_PROMOTION_DISABLED", "Automaticke promotion neni pro tento gate povoleno.");
  if (!policyEntry) return blocked("NOT_ENROLLED", "Aplikace jeste neni zarazena do GARP 2.5.1 auto-patch politiky.");
  if (policyEntry.mode !== "auto-patch") return blocked("POLICY_MODE", "Aplikace nema rezim auto-patch.");
  if (policyEntry.assuranceBaseline !== "GARP-2.5.1-SHIELD-PREP") return blocked("ASSURANCE_BASELINE", "Aplikace nema schvaleny GARP 2.5.1 SHIELD-PREP baseline.");
  if (policyEntry.requiredVerification !== "deployment") return blocked("POLICY_VERIFICATION", "Auto-patch politika nevyzaduje zive deployment overeni.");
  if (base.change === "invalid") return blocked("INVALID_VERSION", "Promotion podporuje pouze stabilni SemVer x.y.z bez prerelease/build suffixu.");
  if (base.change === "rollback") return blocked("ROLLBACK", "Rollback se nikdy neprijima automaticky.");
  if (base.change !== "patch") return blocked("NON_PATCH_CHANGE", `Zmena typu ${base.change} vyzaduje rucni posun release wave.`);

  if (!parseStrictSemver(policyEntry.minimumVersion)) return blocked("INVALID_MINIMUM_VERSION", "Promotion policy obsahuje neplatnou minimumVersion.");
  if ((compareVersions(fromVersion, policyEntry.minimumVersion) ?? -1) < 0) return blocked("PRE_GARP_BASELINE", `Release-wave baseline ${fromVersion} je starsi nez GARP enrollment ${policyEntry.minimumVersion}.`);
  if ((compareVersions(toVersion, policyEntry.minimumVersion) ?? -1) < 0) return blocked("PRE_GARP_CANDIDATE", `Detekovana verze ${toVersion} je starsi nez GARP enrollment ${policyEntry.minimumVersion}.`);

  if (sourceReport?.ok !== true || sourceReport?.verification !== "deployment") return blocked("SOURCE_NOT_LIVE_DEPLOYMENT", "Auto-patch vyzaduje uspesne overeni skutecne nasazeneho manifestu; repository fallback ani snapshot nestaci.");
  if (sourceReport.version !== toVersion || sourceReport.sourceVersion !== toVersion) return blocked("SOURCE_VERSION_DRIFT", "Sync report nepotvrzuje stejnou verzi nasazeni a zdroje jako candidate.");
  if (app?.aiCore?.serverReady && sourceReport.operationsWarning) return blocked("AI_OPERATIONS_UNVERIFIED", `AI operations manifest neni overen: ${sourceReport.operationsWarning}`);

  const repository = String(app?.repository || "").toLowerCase();
  const expectedRepository = String(source?.repository || "").toLowerCase();
  const reportedRepository = String(sourceReport?.repository || "").toLowerCase();
  if (!repository || repository !== expectedRepository || repository !== reportedRepository) return blocked("REPOSITORY_IDENTITY", "Repozitar candidate neodpovida registrovanemu a overenemu zdroji.");

  const platform = app?.platform || {};
  if (platform.contract !== "ghrab-platform-v1") return blocked("PLATFORM_CONTRACT", "Candidate ma nepodporovany platformni kontrakt.");
  if (platform.platformVersion !== wave?.platformVersion) return blocked("PLATFORM_VERSION", "Candidate meni zamcenou verzi GHRAB Platform.");
  if (platform.requiredPlatformRange !== wave?.requiredPlatformRange) return blocked("PLATFORM_RANGE", "Candidate meni requiredPlatformRange release wave.");
  if (app?.compatibility?.platformRange !== wave?.requiredPlatformRange) return blocked("COMPATIBILITY_RANGE", "Candidate meni compatibility platform range.");
  if (platform.storagePrefix !== `ghrab.${app.id}.`) return blocked("STORAGE_NAMESPACE", "Candidate meni nebo porusuje storage namespace.");
  if (platform.cacheName !== `ghrab-${app.id}-v${toVersion}`) return blocked("CACHE_IDENTITY", "Candidate nema cache navazanou na appId a verzi.");
  if (![2, "ghrab-studio-handoff-v2"].includes(platform.studioBridge)) return blocked("STUDIO_BRIDGE", "Candidate meni podporovany Studio Bridge contract.");
  if (![1, "ghrab-artifact-envelope-v1"].includes(platform.artifactEnvelope)) return blocked("ARTIFACT_ENVELOPE", "Candidate meni podporovany artifact envelope contract.");

  return eligible();
}
