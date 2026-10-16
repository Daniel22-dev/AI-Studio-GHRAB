export function releaseImpact(path) {
  return /^(src\/(?!tests\/)|platform\/|security\/|\.github\/workflows\/|ci\/|qa\/|scripts\/(?!test-)|package(?:-lock)?\.json$|ghrab-platform\.consumer\.json$)/.test(path);
}
export function validateLogbook(log, version) {
  const issues = [];
  if (log?.schema !== "ai-studio-changelog-v1" || !Array.isArray(log.items) || !log.items.length) return ["Invalid or empty release logbook"];
  if (log.current !== version || log.items[0]?.version !== version) issues.push("Newest logbook version must match package.json");
  const top = log.items[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(top?.date ?? "")) issues.push("Missing release date");
  for (const lang of ["cs", "en"]) {
    if (!top?.title?.[lang]?.trim() || !top?.changes?.some(c => c?.[lang]?.trim())) issues.push("Missing "+lang+" release content");
  }
  return issues;
}
export function validateReleaseChanges(paths, before, after) {
  if (!paths.some(releaseImpact)) return [];
  const semver = s => /^\d+\.\d+\.\d+$/.test(s) ? s.split(".").map(Number) : null;
  const a = semver(after), b = semver(before);
  const newer = a && b && (a[0]>b[0] || (a[0]===b[0] && (a[1]>b[1] || (a[1]===b[1] && a[2]>b[2]))));
  return [...(!newer ? ["CI/runtime changes require a new version"] : []), ...(!paths.includes("src/config/changelog.json") ? ["CI/runtime changes require a logbook update"] : [])];
}
