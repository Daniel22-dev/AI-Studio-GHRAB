# AI Studio GHRAB – P1 bounded release-identity concurrency

**Date:** 2026-10-15
**Scope:** CI-only orchestration, on top of P0 release-identity observability PR #238.
**Original source base:** `1417ac18fab81e8fe3ac1a3b91a56d05020a4654` (historical P0 branch). P0 has since been certified and deployed; P1 PR #239 targets `candidate`.
**Status at PR review:** P0 production-certified; P1 implementation revalidated locally, retargeted to `candidate`, and awaiting P5 certification. Not yet production-certified.

## Exactly what changed

`scripts/verify-deployment-release-identities.mjs` now starts **at most three independent application verifications at once** (`GHRAB_RELEASE_IDENTITY_CONCURRENCY=3` by default). Each application still performs the **complete existing serial chain** of network fetching, retry/backoff, live manifest, SHA-256, artifact digest, release integrity and provenance checks within `verifyDeploymentReleaseIdentity`; that implementation is **unchanged**.

A worker reserves an index in `sync-report.json.sources`. Each result is held in memory. Once **all** workers have finished, results, decision counts, logs and timing evidence are committed **in the original source order**. Failed verifications remain `FAILED`, mark the corresponding source `ok=false`, record `identityError`, and make the command exit with status 1. Missing registrations remain skipped, `NOT_APPLICABLE` and `ABSENT` preserve the previous policy, and repeated source rows are not deduplicated.

The P0 evidence schema (`ghrab-release-identity-timing-v1`), field names and `sync-report.json` shape are unchanged (aside from inherently variable timings/timestamps). The only new operational setting is `GHRAB_RELEASE_IDENTITY_CONCURRENCY` with valid integer values **1, 2, 3**; invalid values **fail closed** before live verification.

No changes to workflow trigger/needs/rulesets, GARP, P5 R2, Safe Promotion, SHA freshness, artifact sharing, browser setup, cache, deploy, LIVE assurance, remote URLs or signature policy.

## Controls and test evidence

`npm run test:release-identity-timing` uses **23 deterministic local mock test cases** (15 P0 + 8 P1). The new cases validate:

1. Maximum three simultaneous live-app verifications over eight applications, and verification of every row.
2. **Serial rollback (`=1`) is decision/report-equivalent** to parallel mode (`=3`), with identical per-source status and counters and stable log order (ignoring timestamps/elapsed durations).
3. Out-of-order responses, failure in one app, other apps finishing despite failure, and stable report/evidence ordering.
4. HTTP 429 retry on one app without altering retries or safety checks of other apps.
5. Invalid settings 0, 4, -1, NaN and 1.5 are rejected before processing; no green assurance is emitted.
6. Repeated/duplicate source rows are all processed (not deduplicated).
7. One HTTP 404 failure does not mask successful verifications elsewhere (global exit remains fail-closed).
8. Bounded operation with `=2` as well as `=1` and `=3`.

The prior 15 P0 cases also cover both release contracts (patch assurance and transitional release integrity), corrupt or missing JSON, incorrect hashes/revisions, 429 exhausted retries, timeouts, missing identities, unregistered sources, and advisory write failures.

**Local verification:** `node --check` on modified modules and `npm run test:release-identity-timing`: **23/23 passed** (Node.js 22.16.0). Additional local suites: CI topology **22/22 PASS**, release promotion **PASS**, auto-patch idempotence **PASS**, runtime fallback **PASS** (including admission regressions). Full P5/release suite requires dependency installation in GitHub CI; previous local `npm ci` could not reach `registry.npmjs.org` (`EAI_AGAIN`). These local results do **not** constitute live network A/B or release certification.

## Evidence and performance expectations

P0 historical six `deploy.yml` release-identity step timings measured Oct 12–13, 2026: **24, 28, 32, 34, 41, 42 seconds**, median **33 seconds**. The synthetic concurrency test confirms actual overlapping I/O and identical decisions under deliberately staggered network latency. However **no actual post-P1 GitHub Actions run** exists yet. Saving **5–25 seconds** is an **estimate only** and may be zero or negative under rate limiting / unusually fast network.

To certify measurable gain: obtain at least **five comparable success runs** of P0 serial mode and five of P1 (same 9 application versions and fixed release sources where feasible), compare wall-clock release-identity step time, complete candidate->PR->main->deploy critical path, compute-minute usage, failures and HTTP429 retry counts. Compare `sync-report.json` identities, evidence and the exact tested SHA; investigate rate-limit increases or mismatched results. The P1 concurrency setting may be forced to `1` for live A/B without changing correctness.

## Rollout, acceptance, and rollback

- P1 was originally stacked on **P0**. After P0 passed candidate/PR/main P5 gates and deployed successfully, PR #239 was retargeted to the canonical `candidate` branch. Only the three reviewed P1 files differ from the current candidate tree.
- No required promotion, source-attestation or release gate may be removed or weakened. No production merge until canonical candidate/PR P5 and deploy checks are green and per-app evidence matches.
- **Emergency serial mode:** `GHRAB_RELEASE_IDENTITY_CONCURRENCY=1 node scripts/verify-deployment-release-identities.mjs` (to apply in CI, set this environment variable explicitly on the identity verification steps). This preserves the P0 serial scheduling.
- **Code rollback:** revert the P1 commit/PR; P0 continues with serial identity verification. No rollback of P0 telemetry is necessary.
- If rate limits, unexpected upstream load, incorrect ordering or security parity violations are observed, revert to `=1` immediately, retain evidence, and do not promote the candidate.
- The optional removal of the `candidate-to-main` job is **out of scope** because its required-check/topology implications were not formally cleared.

**Verdict:** P1 implementation passes offline synthetic regression tests but remains **YELLOW** pending required live CI and 5-run A/B validation. No achieved production speedup is claimed.
