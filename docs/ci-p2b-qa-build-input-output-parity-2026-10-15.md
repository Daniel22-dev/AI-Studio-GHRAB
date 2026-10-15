# AI Studio GHRAB - P2B QA build input/output parity audit

Date: 2026-10-15. Starting production main/candidate SHA: `866192af965ce9915a40a22e83e62e1aa2421ee5` (P2A).

## Scope: evidence collection, NOT another disabled build

`qa/qa-manifest.json` still requires `testCommand: npm test` and `buildCommand: npm run build`. The `npm test` command creates its own `dist` before built-artifact regression tests. Later, `qa:release` deliberately launches a separate `project-build` after those tests. Both builds are **still mandatory in P2B**. No GARP, P5 R2, release identity, manual-PDF, CI workflow trigger, Safe Promotion rule or cross-job artifact boundary is changed.

P2B instruments the two builds **only while they are invoked by `scripts/qa-release.mjs`**. Outside this scope, `scripts/build.mjs` runs without observations. Observations are strictly read-only for the generated `dist`, and are written exclusively into `qa-results/p2b-build-traces/` and `qa-results/p2b-build-comparison.json` (already within the production QA evidence artifact). They are not a deployment asset and never appear inside `dist`.

## Evidence and safeguards

Each build creates an immutable start and completion record. It captures:

- SHA-256 of all regular files beneath `src/`, `scripts/`, `vendor/`, `qa/`, and existing `config/`, `security/`, and `ci/`; plus `package.json`, `package-lock.json`, `ghrab-platform.consumer.json`.
- Exact byte SHA-256 of **every generated file** in `dist`, with a combined deterministic pathname+digest tree SHA-256. Ignores filesystem mtimes.
- Independently computed **normalized** output digest, ignoring only the validated `builtAt` JSON values in `dist/build-info.json` and `dist/platform-build-info.json`. No content outside these two fields is normalized.
- Build phase (`project-tests` or `project-build`), Node version, OS/arch, optional commit SHA, timestamps, file counts, and bounded changed-file lists.
- Per-phase normalized output parity, raw output parity and build input parity.

A mismatch produces `INPUT_DRIFT` or `OUTPUT_DRIFT` **as an advisory finding**, not an excuse to suppress safety controls or to deploy an unverified artifact. Bad/missing/incomplete trace records, invalid build timestamps, missing build artifacts, symlinks and mismatched source identities **fail closed** by stopping `qa:release`.

The report's `approvedToSkipBuild` remains **`false` under every condition**, including a `PARITY_CANDIDATE` result. A single equal pair cannot establish release safety, provenance under different CI stages, or determinism on future inputs. The report does not replace SHA-256 release attestations, GARP, P5 R2 or the existing mandatory QA gates.

## Local results at preparation

- New observer/regression tests: **22/22 PASS** including timestamp normalization, source mutation, output tampering, symlink, missing evidence, wrong SHA, and preservation of both required build commands.
- Existing CI topology, P0/P1 identity, P2A reporter parity tests: **64/64 PASS**.
- Two independent, real `scripts/build.mjs` executions on the current source: 203 output files each; **input SHA equal**, **raw `dist` SHA different**, and **normalized `dist` SHA equal**. Raw differences were precisely `build-info.json` and `platform-build-info.json` timestamps. The trace reported `PARITY_CANDIDATE`, `approvedToSkipBuild: false`.
- These executions do not replace a full GitHub Actions `qa:release`, since tests can mutate inputs between the first and second real QA builds. P2B is designed to discover exactly that difference inside production QA.

## Release evidence and acceptance

1. On a PR, run new P2B negative tests in the independent P5 workflow, then the unchanged GARP 2.7 FOUNDATION and P5 R2 suites. Keep the CI topology check.
2. On `candidate` after PR merge, require a complete P5 R2 success; then Safe Promotion must create its normal PR to `main`, which must independently pass P5 R2.
3. After Safe Promotion, require full `main` P5 success, production `qa-build` success, `qa-diagnostics` success, and `deploy-pages` success.
4. Download production QA artifact and inspect `p2b-build-comparison.json`. Require at least one complete `project-tests` and one `project-build` pair, a real two-build comparison, stable commit provenance, and no incomplete starts or corrupted timestamps. Inspect differences instead of suppressing them.
5. Record at least five successful independent production QA release samples. Only then consider a **new, separately reviewed optimization PR** that proposes removal of a redundant build, with tamper-negative tests and a full GARP/P5 proof; P2B itself never removes any build.

## Rollback

Revert this dedicated P2B PR through the protected `candidate` -> P5 R2 -> Safe Promotion pipeline. It removes the observer hooks and evidence files and returns the original `qa:release` command environment. The two existing builds and the P2A reporter checks stay intact. Never use a force-push, waived check, or direct unauthorized update to protected `main`.

## Risk qualifications

Input fingerprints cover a conservative set of first-party build inputs, **not** the whole external runner image or all possible environment variables. The release must not promote the comparison status to a source or artefact attestation. Timestamp normalization is for analysis only: the **raw** hashes are always retained and audited. A missing or invalid observation is blocking, while a legitimate mismatch simply records that redundancy has not been proven.

The known `qa:release` project audit (`npm audit`) and all other independent checks retain their current failure/skip policy. Manual visual approval and live HTTP smoke-test are outside P2B scope and must not be claimed by a green automated run.
