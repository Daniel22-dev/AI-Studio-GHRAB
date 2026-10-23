# AI Studio Stage 05 - Material Flow Hub (integration candidate)

**Status: NO DEPLOY.** Built and tested locally against an archived project snapshot (0.21.241), while live GitHub main was 0.21.253 at the time of inspection. This package is a staging/source overlay, not a current-main release.

Contents:
- `stage05-main-rebased.patch`: full relative-source patch including new modules, updated Studio UI, registry and tests.
- `overlay/`: the same changed files in original project paths for inspection. Do not replace the full repository; apply the patch to a fresh main checkout.
- `docs/stage05/`: audit, consumer contract, test/security report, deployment checklist, deployment and self-integration checklist.
- `evidence/`: sample security/core test logs and isolated responsive UI screenshots.
- `manifest/`: SHA-256 of included patch/files.

Key outcomes: canonical dual-key workspace, registry-driven three-target routing, one-time Bridge v2, privacy preflight and inbound validation, edit/anonymize flow, old-source regression and focused security tests.

No Generator source changes. No GitHub, Cloudflare or production deployment changes.

**Outstanding release gates**: apply/rebase on current main, resolve pre-existing ecosystem VERSION drift; app-manifest schema conformance is now 10/10 current and 9/9 older, execute full browser-to-consumer UAT and complete release QA. Existing offline ecosystem checks failed even on the unchanged archived baseline. This is NOT a go-live certificate.


The owner explicitly requested ChatGPT to perform the implementation directly; no Codex handoff is required or included. Stage 05 is implemented locally and rebased against **exact GitHub main blob baselines for all changed tracked paths**, but complete live-main CI and multi-app browser UAT remain release-blocking. GitHub remains unchanged.
