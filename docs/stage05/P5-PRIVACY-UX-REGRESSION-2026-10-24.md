# Stage05 / AI Studio 0.21.255 — P5 UX privacy contract fix

**Date:** 2026-10-24  
**Environment:** preproduction `candidate`, production `main` unchanged  
**Affected release:** candidate SHA `6142912868c18b74cfc57605689a164527fcc2d4`

## Diagnosis

Both independent official P5 runs [40023719113](https://github.com/Daniel22-dev/AI-Studio-GHRAB/actions/runs/40023719113) and [40023725030](https://github.com/Daniel22-dev/AI-Studio-GHRAB/actions/runs/40023725030) failed in the *Verify Studio UX and manual PDF review contract* job step.

The failure was:

> Studio UX/regression test failed: Serverove sdileni nema ochranu proti publikaci materialu s osobnimi udaji.

The obsolete source-based assertion in `scripts/test-studio-ux.mjs` required literal `containsPersonalData === true`. Stage05 PR #309 intentionally replaced that weak exact-true check with **stronger** `inspectOutboundMaterial(material, { validator: G.validateMaterialPackage })`, rejecting absent or false-confirmed privacy flags, nested roster fields, e-mail addresses and active HTML. The new implementation passed **25/25** targeted Node privacy and material-flow tests before merge.

## Narrow repair

- Replace literal-string expectation with the actual shared material-flow preflight contract.
- Add functional negative cases to Studio UX: missing privacy confirmation, explicitly true PII flag, nested class roster, e-mail, unsafe HTML; all must fail with `TypeError` *before any fetch*.
- Preserve the existing GitHub Pages `schoolServerConnected:false` assertion and no-network expectation.
- Add review CI syntax validation of `scripts/test-studio-ux.mjs`.

**Do not revert or weaken privacy protection just to satisfy a static test.** No signed permission, access policy, consumer app, runtime deployment, student data or server configuration is modified.

## Release acceptance

1. Review PR: Node syntax and all Stage05 material tests green.
2. After candidate-only merge: official **full P5 PASS on exact merge SHA**.
3. Separate authorized real-consumer 6/6 desktop/mobile handoff E2E still pending and cannot be silently waived.
4. Only after all release gates and explicit sign-off should candidate→main Draft PR #305 be promoted; preserve Conversation Lab topic manager in same integrated candidate.
