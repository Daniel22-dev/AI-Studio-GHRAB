# AI Studio GHRAB - P2C guarded internal test-build reuse

Date: 2026-10-16. Source baseline: `35a8de5da538f96c22500dc4304f7ab60cdc061a` (P2B deployed, main=candidate).

## Safety decision

P2B production evidence showed four builds inside `qa:release`: (1) initial `npm run build` in `npm test`; (2) direct `scripts/build.mjs` in `scripts/test-reporter-mail.mjs`; (3) direct `scripts/build.mjs` in `scripts/test.mjs`; and (4) independent `project-build` after tests. Build (2) and (3) had identical input SHA-256 and identical **timestamp-normalized** output SHA-256. The latest `project-build` must remain because `src/config/ai-readiness.generated.json` changes during the test chain.

P2C eliminates **only build (3)** inside `scripts/test.mjs`, and only when an exact runtime proof is available. The following remain unchanged and mandatory: the initial npm test build, the reporter build and actual browser regression, the post-test `project-build` from `qa/qa-manifest.json`, GARP 2.7 FOUNDATION, independent P5 R2 checks, source/release identity verification, manual-PDF contracts and protected Safe Promotion. The P2B trace schema is preserved; P2C writes separate evidence into `qa-results/`, never into the deployment `dist`.

## Reuse authorization (fail-closed)

Reuse is enabled *only* for `qa:release` -> `project-tests` when all of `GHRAB_QA_P2C_REUSE=1`, `GHRAB_QA_P2B_TRACE=1` and `GHRAB_QA_P2B_PHASE=project-tests` are present. Standalone `node scripts/test.mjs` and all other contexts still execute the original direct build. In CI, the exact 40-hex `GITHUB_SHA` must be known.

At the original internal rebuild point, the guard requires:

1. Precisely two complete, chronological P2B start/completion pairs from `project-tests`, correctly bound to the current source commit, Node version and platform/architecture.
2. Independently consistent per-file SHA-256 tree records, valid counts and paths, no symlinks or unpaired trace files.
3. A real completed error-reporter browser regression with `browser.status=passed`.
4. Live SHA-256 of *all* build inputs matching the latest observed reporter build.
5. Live **raw byte-for-byte SHA-256** of *every* file in the existing `dist` matching that reporter build, plus matching normalized SHA. Timestamp-only changes are **not** ignored for the reuse decision.
6. Fresh immutable `qa-results/p2c-built-artifact-reuse.json` recording proof digests, source, build identity and exactly one skipped rebuild.

Any absence or mismatch blocks reuse and fails the QA tests. There is no permissive fallback that silently replaces an invalid trust proof with a skip. The proof itself is revalidated after the independent `project-build`, and a complete QA run must contain exactly **two** observed project-test builds plus exactly **one** independently observed project-build. P2B's `approvedToSkipBuild=false` field remains untouched because it describes P2B itself and never authorizes a skip.

## Tests and rollout

Local P2C test suite includes positive proof verification, source mutation, dist tamper, timestamp tamper, invalid build traces, symlink injection, mismatched source commit, missing/failed browser evidence, duplicate reuse, missing independent build and evidence modification. Integration checks confirm the separate `project-build` remains in QA manifest and that GARP/P5 workflow entries are unchanged. Run the P0/P1/P2A/P2B and CI topology suites as regressions.

After PR review: merge **only** via candidate, require candidate P5 R2 GREEN, Safe Promotion candidate-to-main PR independently GREEN, main and candidate P5 GREEN, production QA and reporter tests GREEN, `deploy-pages` success. Download production QA evidence and require P2B observations=3, P2C `VERIFIED_REUSE`, browser PASS, valid source identity and no corrupted evidence. Record full-run durations against P2B 250-second qa-build. Do not attribute unrelated runner/Chromium variance to the optimization.

## Rollback

Set `GHRAB_QA_P2C_REUSE=0` for `qa:release` to restore the original third build without disabling P2B, P2A, P5 or GARP. Invalid values are rejected. Durable rollback is an ordinary revert PR through candidate, P5 R2 and Safe Promotion. No force-push, branch-protection bypass, cross-job artifact sharing, new browser cache or weakened release attestations.

## Limitations

P2C proves safe reuse **within the same QA job and input snapshot**; it does not establish cross-job build equivalence or eliminate source regeneration of AI-readiness data. It is not a complete CI/CD speedup certification. Manual visual acceptance and independent live HTTP smoke are separate from the automatic GitHub Pages deployment result.
