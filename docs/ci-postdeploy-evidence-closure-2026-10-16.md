# AI Studio GHRAB — release evidence closure (2026-10-16)

## Baseline
Main and candidate: `e85f2dd5f6845b9c8e66879bf05152e7abf83dfc` at preparation.
Previous production run: [#38855588810](https://github.com/Daniel22-dev/AI-Studio-GHRAB/actions/runs/38855588810), successful. This proves GitHub Pages deployment action success, but **not independently fetched public content**.

## Changes proposed
1. Save original `test-results/error-reporter.json` bytes to `qa-results/p2c-original-error-reporter.json` at the moment P2C attestations are issued. Verify its SHA-256 against `p2c-built-artifact-reuse.json` before QA completion. The later P2 reporter test is allowed to overwrite `test-results/error-reporter.json` without erasing the original witnessed bytes.
2. After all existing QA, GARP, P5, deployment preparation and LIVE assurance steps have succeeded, record exact SHA-256 of the three public assets `dist/index.html`, `dist/build-info.json` and `dist/sw.js` **from the same filesystem the Pages artifact is uploaded from**. Associate this with exact `github.sha`. Upload as private workflow artifact.
3. After `deploy-pages` succeeds, run an independent new GitHub Actions job that downloads the expected hashes and performs actual anonymous HTTPS requests to the live Pages URL. Fail the job unless all three byte hashes match. Allow up to 12 retries with a cache-busting SHA parameter for CDN propagation. Retain result as separate workflow artifact for 90 days.

## Security boundaries and limitations
- **No security gates removed.** The new post-deployment check cannot retroactively prevent Pages publication; it records a detectable FAIL after deployment. Rollback is a separately protected release.
- Snapshot comparisons establish exact byte parity for **the three selected files**, not the whole 50+ MB Pages artifact. Existing GARP / P5 attestations remain needed. Production source SHA is checked against `github.sha`; PR merge-checkout attestation is a different question and must be audited separately.
- Workflow artifact retention is 90 days, **not permanent retention**. Permanent archival requires organization-backed storage and a retention policy. Do not claim this PR has configured permanent storage.
- Post-deploy visual or functional human acceptance is **not** established by these three binary checks. School personnel must still review the public UI or approved screenshots.
- Network isolation of the analyst's runtime prevents directly fetching the public GitHub Pages site. The GitHub Actions runner is used to provide the independent live HTTP evidence.
- Branches `main` and `candidate` must not be advanced until the draft PR passes topology checks and code review. Any subsequent merge must use the established Safe Promotion path.

## Acceptance evidence required before closure
- `node --test scripts/test-qa-p2c-build-reuse-guard.mjs` PASS (26 negative/positive cases).
- Existing P2B / P2A and CI topology checks PASS.
- Candidate and promotion PR P5 R2 gates PASS.
- Production `qa-build` PASS, original reporter file retained with hash matching P2C.
- Independent `post-deployment-live-parity` PASS; `sourceCommit` must match deployed commit in the checked artifact.
- Human screenshot/manual acceptance: recorded separately; do not mark complete without review.

## Expected result
The audit is complete only when new evidence from the fresh deployment exists. A green historical deployment alone is insufficient.
