# Stage 05 / 0.21.255: MC4 compatibility and authorized UAT release hold

**Date:** 2026-10-23. **Status:** REVIEW ONLY / NO DEPLOY. This branch is based on `candidate` at `d7b9f5e80b253e914da1ba96213f4b9845ca3b92`. Do not replace the candidate release identity or the separate Conversation Lab work.

## Verified baseline
- Candidate `0.21.255` passed the official P5 R2 pre-production run [40017711762](https://github.com/Daniel22-dev/AI-Studio-GHRAB/actions/runs/40017711762); this was **before** the changes on this review branch.
- The missing static Material Flow module was added to the offline precache in candidate 0.21.255. Do not regress that fix.
- The published real-consumer browser run [40014180298](https://github.com/Daniel22-dev/AI-Studio-GHRAB/actions/runs/40014180298) failed in six desktop/mobile cases. Its archived screenshots show all three real consumer applications presenting the legitimate school authorization gate. The original test checked the gate before asynchronous initialization, then timed out waiting for an import. These are not Bridge import failures, nor successful import tests.

## This review change
1. Extend Studio-controlled declarative consumer requirements for LUDUS: MC4/select items need exactly four options and a valid answer index/value; enforce requirements **before** preparing the handoff. No LUDUS source or game runtime changes.
2. Add negative tests for two-option MC4, missing/invalid answers and malformed option rules; retain offline-module precache regression coverage.
3. Add an opt-in browser UAT script that waits for either the **visible legitimate access gate** or a verified synthetic import, emitting `AUTHORIZATION_REQUIRED` rather than a misleading timeout. Authenticated teacher UI is never screenshotted into CI evidence; gate-only images and metadata-only diagnostics may be retained.

## Release gates
- Revalidate this exact review commit with `npm run test:material-flow`, `npm run test:studio-ux`, `npm run test:security-regressions`, `npm run test:garp-security`, `npm run build`, `npm run qa:ecosystem`, offline browser startup, and the official P5 test. Do not mark these PASS just because the parent candidate succeeded.
- Authorized test participants must use **legitimately activated** access to Generator, Differentiator and LUDUS; no access-gate bypass, fabricated licence or credential export. Their signed/issued training requirements remain authoritative.
- In a same-origin authorized browser, test source-text import into Generator and Differentiator, structured tasks into LUDUS, visible input fields, one-time consume, pending/cancel, return URL, 30-minute TTL, double consume, cross-origin rejection, malformed/oversized material, XSS and PII guard. Test desktop and mobile, with synthetic teaching examples only.
- Verify the invalid two-option MC4 case is **not offered** as LUDUS-compatible before handoff.
- Record exact commit SHA and consumer versions, redact any identity and tokens from manual evidence, and obtain release approval before integration/promotion.

**NO-GO** until full post-patch P5 and authorized real-consumer browser acceptance are documented. Do not push to `candidate`/`main`, merge, deploy or trigger Safe Promotion from this review work.
