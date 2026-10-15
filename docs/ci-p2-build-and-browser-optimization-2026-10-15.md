# AI Studio GHRAB – CI/CD P2 build/install/browser review and safe production change

Date: 2026-10-15. Starting base SHA: `62963d35344aa7fc09137169ae80a8a69f4fac2f` (P1 certified and deployed).

## P2A change to be deployed

The original `deploy.yml` did an explicit `npm run build` **only** for `npm run test:reporter` immediately before `npm run qa:release`. `scripts/qa-release.mjs` then deletes the entire `dist` directory (`rm(buildRoot, recursive=true)`) and rebuilds during `npm test` and again through `qa/qa-manifest.json` `buildCommand`. Thus the early reporter-only artifact was thrown away, but the associated reporter browser regression was genuinely required.

Move the **unchanged reporter regression** to immediately after the QA release gate, eliminating precisely the obsolete reporter-only build invocation. A new fail-closed runner (`scripts/p2-reporter-build-parity.mjs`):

- Fingerprints *every* file in the QA-built `dist` via SHA-256 before and after the reporter test, in deterministic path order; rejects symlinks, absent/incomplete dist and any added/removed/modified file.
- Deletes any stale `test-results/error-reporter.json` before running `npm run test:reporter` and requires a *fresh* `ghrab-error-reporter-test-v1` result with matching app ID and version, browser status `passed`, >0 passed checks and 0 failures.
- Treats a failed reporter subprocess, incomplete or mutated artifact, invalid/missing evidence, or harness error as an unconditional blocking failure.
- Emits machine-readable `qa-results/p2-reporter-build-parity.json` for the existing `Upload QA evidence` step. This artifact includes content digests, file count, browser verdict and duration; no personal/student data and no application secrets.
- Does not re-use a build across jobs or trust boundaries. GARP FOUNDATION, P5 R2, LIVE assurance, Platform checks, Playwright versions/install and `npm ci` semantics remain identical.

Independent `p5-release-gate.yml` additionally executes `node --test scripts/test-p2-reporter-build-parity.mjs` **before** the GARP/P5 checks. Production `qa-build` runs the actual browser reporter test after its own mandatory QA rebuild.

## Quantified pre-change baseline (actual GitHub Actions)

| GitHub Actions deploy run | Reporter-only build | Reporter regression | QA release | Chromium install | Total `qa-build` |
|---|---:|---:|---:|---:|---:|
| 38794737525 (P1) | 1 s | 14 s | 83 s | 30 s | 265 s |
| 38790090886 (P0) | 1 s | 13 s | 75 s | 20 s | 243 s |
| 38366665203 | 1 s | 13 s | 84 s | 23 s | 273 s |
| 38360802250 | 1 s | 14 s | 80 s | 30 s | 281 s |
| 38356390492 | 2 s | 12 s | 76 s | 25 s | 243 s |

**Expected removal is just 1–2 s per deployment**, before compensating for new SHA-256 scans. This change prioritizes *correctness and smaller redundant work*; it does not promise a measurable wall-clock improvement in the overall 4-minute release. Compare at least five future healthy deploys before declaring a statistically reliable net improvement.

## Tests and security parity

`node --test scripts/test-p2-reporter-build-parity.mjs` covers PASS, same-size byte mutation, added/deleted files, root/nested symlink attack, missing `dist`, missing `build-info.json`, reporter nonzero exit, missing evidence, browser not-ready, reporter failure, wrong app/version, zero tests, deterministic fingerprint stability, workflow required step ordering, QA fresh build contract and P5 gate ordering. **19 local tests PASS**.

Local static ecosystem tests **22 PASS**; local release promotion, auto-patch idempotence and runtime fallback also PASS. A full local `npm run build` succeeded and fingerprinted 203 files (~59 MB). A deliberately unready local Chromium environment caused the new end-to-end wrapper to **fail closed**, with unchanged dist hashes. Production browser correctness must still be confirmed by real GitHub Actions, including new `browser.status=passed` evidence.

The existing GARP and P5 independent builds are **not removed**, since they are required stage/attestation boundaries. There is no source SHA/artifact reuse across jobs.

## Other P2 candidates – explicit no-go without stronger evidence

1. **Second `npm ci`:** `deploy.yml` first executes `npm ci --ignore-scripts`, while the QA manifest later runs `npm ci` without that flag. The latter takes ~0.44 s in one inspected QA run. These runs are not trivially equivalent because npm lifecycle scripts may execute differently. Do not remove without a clean-runner package-tree/side-effect proof.
2. **Second QA build:** QA release invokes `npm test` (which itself builds), then `project-build`. The second clean build intentionally follows tests that may affect generated files. Do not remove until the actual build-input and post-test output state can be cryptographically attested.
3. **GARP/P5 independent builds:** retain entirely until exact source tree, toolchain and artifact hashes are cryptographically joined to the correct release stages.
4. **Duplicate manual-PDF browser checks:** `qa:browser` includes `test:manual-pdf`, and P5 executes it again after preparing the distribution. Keep both because they exercise different artifact states.
5. **Browser binary caching:** official Playwright CI documentation **does not recommend it**; archive restoration can cost as much as downloading binaries, and Linux OS dependencies cannot be cached. Benchmarks first, then digest-pinned isolated canary, not a speculative production cache rollout. Source: https://playwright.dev/docs/ci#caching-browsers
6. **Cross-job dist reuse:** NOT PERMITTED until tested PR merge tree/source SHA/immutable input fingerprint, output SHA-256 manifest, negative tamper cases, independent P5/GARP evidence, and explicit trust-stage design exist.

## Rollback and release procedure

- Rollback: revert this self-contained P2 PR, restoring `Build application for reporter regression`, original reporter step and original order. Re-run full candidate P5 and Safe Promotion; do not bypass status checks.
- Release sequence: dedicated P2 branch → draft PR review → CI topology PASS → merge to `candidate` → P5 R2 success with reporter-parity tests → canonical Safe Promotion PR → main P5 and production `qa-build` → `deploy-pages` success.
- Verify the production QA artifact contains `p2-reporter-build-parity.json` with `status=PASS`, `qaDistBefore.digest == qaDistAfter.digest`, `reporter.browser=passed`, `reporter.failed=0` and original `qa-report.json` gates all PASS.
- No changes to branch rules, Safe Promotion, GARP required controls, live release identity algorithm, application runtime, UI or student data.

## Completion status

P2A implemented and locally validated. P2A production certification is pending at the time of this document; inspect the final GitHub runs and update the external validation report after deployment. Other P2 subtopics remain deferred for explicit evidence-based acceptance, **not silently treated as implemented**.
