const STRICT_SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const SHA40 = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const SUPPORTED_EVIDENCE_CONTRACTS = new Set([
  "ghrab-patch-assurance-v1",
  "ghrab-release-integrity-v2",
]);

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

export function evaluateRepositoryFallback({ waveVersion, candidateVersion }) {
  const comparison = compareVersions(candidateVersion, waveVersion);
  if (comparison === 0) {
    return {
      status: "CURRENT",
      reasonCode: "SOURCE_MATCHES_WAVE",
      reason: "Repository source matches the accepted release-wave baseline.",
    };
  }
  if (comparison != null && comparison > 0) {
    return {
      status: "PIN_WAVE",
      reasonCode: "SOURCE_CANDIDATE_PENDING_RELEASE",
      reason:
        "Repository contains a newer source candidate, but repository verification is not deployment evidence. Keep the accepted release-wave baseline until deployment or explicit manual reconciliation.",
    };
  }
  return {
    status: "BLOCKED",
    reasonCode: comparison == null ? "INVALID_SOURCE_VERSION" : "SOURCE_BEHIND_WAVE",
    reason:
      comparison == null
        ? "Repository fallback versions must be stable SemVer values."
        : "Repository source is older than the accepted release-wave baseline and cannot verify that baseline.",
  };
}

export function isPendingRepositoryCandidate(sourceReport, registryVersion) {
  return Boolean(
    sourceReport?.verification === "repository" &&
      sourceReport?.registryPinned === true &&
      sourceReport?.pendingReleaseCandidate === true &&
      sourceReport?.releaseWaveVersion === registryVersion &&
      sourceReport?.version === registryVersion &&
      compareVersions(sourceReport?.sourceVersion, registryVersion) > 0,
  );
}

export function normalizeStudioBridge(value) {
  if ([2, "2", "2.0", "ghrab-studio-handoff-v2"].includes(value)) return "v2";
  if (value === "not-applicable") return "not-applicable";
  return null;
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
    if (entry.requiredEvidenceContract != null && !SUPPORTED_EVIDENCE_CONTRACTS.has(entry.requiredEvidenceContract)) errors.push(`${entry.id}: neznamy requiredEvidenceContract ${entry.requiredEvidenceContract}.`);
    if (!["v2", "not-applicable"].includes(entry.expectedStudioBridge)) errors.push(`${entry.id}: chybi explicitni expectedStudioBridge baseline.`);
  }
  return errors;
}

export function promotionEntryById(policy) {
  return new Map((policy?.applications || []).map((entry) => [entry.id, entry]));
}

function verifiedReleaseIdentity(sourceReport, app, policyEntry) {
  if (policyEntry?.requiredEvidenceContract !== "ghrab-release-integrity-v2") return { ok: true };
  const identity = sourceReport?.releaseIdentity;
  if (
    identity?.status !== "VERIFIED" ||
    identity?.contract !== "ghrab-release-integrity-v2" ||
    identity?.appId !== app?.id ||
    identity?.version !== app?.version ||
    identity?.assuranceMode !== "TRANSITIONAL" ||
    !SHA40.test(String(identity?.sourceCommit || "")) ||
    !SHA256.test(String(identity?.artifactDigest || "")) ||
    !SHA256.test(String(identity?.manifestSha256 || "")) ||
    !SHA256.test(String(identity?.sbomSha256 || "")) ||
    !SHA256.test(String(identity?.buildProvenanceSha256 || "")) ||
    !SHA256.test(String(identity?.evidenceManifestSha256 || ""))
  ) {
    return {
      ok: false,
      reasonCode: "RELEASE_IDENTITY_UNVERIFIED",
      reason: "Auto-patch vyzaduje strojove overenou GARP release identity: appId, verzi, source commit, exact artifact digest, manifest, SBOM, build provenance a evidence manifest.",
    };
  }
  return { ok: true, identity };
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
  const releaseIdentity = sourceReport?.releaseIdentity?.status === "VERIFIED"
    ? {
        status: sourceReport.releaseIdentity.status,
        contract: sourceReport.releaseIdentity.contract,
        appId: sourceReport.releaseIdentity.appId,
        version: sourceReport.releaseIdentity.version,
        assuranceMode: sourceReport.releaseIdentity.assuranceMode,
        sourceCommit: sourceReport.releaseIdentity.sourceCommit,
        artifactDigest: sourceReport.releaseIdentity.artifactDigest,
        manifestSha256: sourceReport.releaseIdentity.manifestSha256,
        sbomSha256: sourceReport.releaseIdentity.sbomSha256,
        buildProvenanceSha256: sourceReport.releaseIdentity.buildProvenanceSha256,
        evidenceManifestSha256: sourceReport.releaseIdentity.evidenceManifestSha256,
        signatureStatus: sourceReport.releaseIdentity.signatureStatus || null,
      }
    : null;
  const base = {
    appId: app?.id || waveApp?.id || "unknown",
    fromVersion,
    toVersion,
    change: classifyVersionChange(fromVersion, toVersion),
    status: "BLOCKED",
    reasonCode: "UNKNOWN",
    reason: "Neznama chyba promotion kontroly.",
    assuranceBaseline: policyEntry?.assuranceBaseline || null,
    requiredEvidenceContract: policyEntry?.requiredEvidenceContract || null,
    verification: sourceReport?.verification || null,
    detectedSourceVersion: sourceReport?.sourceVersion || null,
    releaseIdentity,
  };

  const blocked = (reasonCode, reason) => ({ ...base, reasonCode, reason });
  const eligible = () => ({
    ...base,
    status: "ELIGIBLE",
    reasonCode: "SAFE_PATCH_DEPLOYMENT",
    reason: "Vyssi patch verze je zive nasazena, zdrojove, platformne a release-identitne konzistentni a aplikace je zarazena do GARP 2.5.1 auto-patch politiky.",
  });

  if (base.change === "same" && isPendingRepositoryCandidate(sourceReport, toVersion)) {
    return {
      ...base,
      status: "PENDING",
      reasonCode: "SOURCE_CANDIDATE_PENDING_RELEASE",
      reason:
        "Repository contains a newer candidate, but the registry remains pinned to the accepted release-wave baseline until deployment or explicit manual reconciliation.",
    };
  }
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

  const identity = verifiedReleaseIdentity(sourceReport, app, policyEntry);
  if (!identity.ok) return blocked(identity.reasonCode, identity.reason);

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
  const expectedStudioBridge = policyEntry.expectedStudioBridge;
  if (!["v2", "not-applicable"].includes(expectedStudioBridge)) return blocked("POLICY_STUDIO_BRIDGE", "Promotion policy nema explicitni Studio Bridge baseline.");
  if (normalizeStudioBridge(platform.studioBridge) !== expectedStudioBridge) return blocked("STUDIO_BRIDGE", "Candidate meni Studio Bridge profil proti schvalenemu GARP enrollment baseline.");
  if (normalizeStudioBridge(app?.compatibility?.studioBridge) !== expectedStudioBridge) return blocked("COMPATIBILITY_STUDIO_BRIDGE", "Candidate meni compatibility Studio Bridge profil proti schvalenemu GARP enrollment baseline.");
  if (![1, "ghrab-artifact-envelope-v1"].includes(platform.artifactEnvelope)) return blocked("ARTIFACT_ENVELOPE", "Candidate meni podporovany artifact envelope contract.");

  return eligible();
}