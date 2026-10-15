# AI Studio GHRAB - P0 release identity timing baseline (2026-10-15)

## Scope

Instrumentation only. No change to `verifyDeploymentReleaseIdentity` security decisions, fetch timeout, retry policy, SHA-256 validation, candidate promotion, P5, or GARP foundation.

Baseline: main SHA `495faf987794385567d0c1f8cb2de96debb80412`, version `0.21.241`.

## Historical successful workflow runs (before P0)

Durations are actual GitHub Actions step timestamps, in seconds. Each row represents a separate completed production deployment, rather than repeated sampling against a frozen remote source snapshot.

| Workflow run ID | Deployment `qa-build` job | `Verify declared deployment release identities` step |
| --- | ---: | ---: |
| 38366665203 | 273 | 41 |
| 38360802250 | 281 | 42 |
| 38356390492 | 243 | 24 |
| 38354452476 | 276 | 34 |
| 38305421415 | 273 | 32 |
| 38304367826 | 266 | 28 |

Observed: identity step **24-42 s** across six successful runs; no per-application timing breakdown was available before P0.

## P0 advisory schema

`qa-results/release-identity-timing.json`:

- `schema`: `ghrab-release-identity-timing-v1`
- `generatedAt`: ISO UTC timestamp
- `runnerGithubSha`: `GITHUB_SHA` from runner, explicitly NOT a claim of exact input-tree attestation
- `totals`: checked, verified, absent, failed, notApplicable, skippedUnregistered, durationMs, fetchRequests, fetchAttempts, fetchRetries
- `applications`: one entry in original report order, containing appId, status, durationMs, fetchRequests, fetchAttempts, fetchRetries

This is **advisory timing evidence**, not release evidence attestation. It does not store URLs, payload contents, credentials, error strings, API tokens, or student data. `sync-report.json` and exit statuses retain the existing semantics. Telemetry write failure emits only a warning and cannot change PASS/FAIL.

## Locally executed regression suite

`node --test scripts/test-release-identity-timing.mjs`: 15 synthetic tests, PASS (Node 22.16.0).

Coverage: VERIFIED for both patch-assurance v1 and release-integrity v2, ABSENT, NOT_APPLICABLE, skipped registry items, HTTP 404, HTTP 429 retry/success, HTTP 429 retry exhaustion, network timeout, corrupt JSON, checksum failure, source revision mismatch, mixed statuses in deterministic order, and advisory-write failure.

## Next phase gate (not implemented)

- P1 may compare bounded-concurrency=3 with serial processing for identical snapshots.
- Require 5 or more comparable successful CI runs after P0, grouped by app count, same pinned toolchain, and verified source snapshots.
- Any future P1 must preserve source ordering, full verification, retry/backoff, all negative/fail-closed cases, exact-SHA binding, and rollback.
- PR merge-ref/source-SHA ambiguity and source-tree mutation must be resolved before considering artifact reuse.

## Important limitation

Local synthetic regression success is not proof that a GitHub Actions candidate/main/promotion/deployment workflow has passed. Do not merge the P0 PR before confirming the expected required checks and clean workflow outcome.
