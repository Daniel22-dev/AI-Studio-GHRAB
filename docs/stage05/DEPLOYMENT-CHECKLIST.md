# Release gate for current GitHub main (Stage 05 integrated locally; production NOT executed)

Read `README-STAGE05.md` in the package first.

1. Start from a clean and current `Daniel22-dev/AI-Studio-GHRAB` checkout, never an existing deployment or downloaded stale source bundle.
2. Create a local feature branch without pushing. Verify its `main` HEAD and app version.
3. Copy `stage05-main-rebased.patch` and run `git apply --check stage05-main-rebased.patch`, then `git apply stage05-main-rebased.patch`. If contexts have drifted, reconcile intentionally; never use `--3way` blindly or silently overwrite a newer file.
4. Inspect `git diff --name-status`. No changes outside Studio, especially no `generator-testu` source.
5. At release readiness, use existing scripts for app registry sync and version bumps, avoiding forced updates on other repositories. Do not bundle `dist/` from the old archived snapshot as a production build.
6. Run `npm ci`, `npm run test:material-flow`, `npm run test:studio-ux`, `npm run test:security-regressions`, `npm run test:garp-security`, `npm run build`, `npm run qa:ecosystem`, then full CI-equivalent if feasible.
7. Confirm library/workflow accessible in private and shared-device modes. Test generator/differentiator/ludus imports in real browsers, including mobile. Test PII and malformed-input rejection. Verify no information is placed in URL.
8. Prepare release identity, signed access bundle and rollback artifact with existing Studio procedures; do not push/deploy until owner explicitly authorizes the specific release.
9. For rollback, revert only Stage 05 source changes on the source branch and republish a separately verified previous production release; do not erase user localStorage or orphan old workspaces.

Potentially relevant commands (do not run automatically on production):

```
git switch -c feat/stage05-material-flow-hub
git apply --check stage05-main-rebased.patch
git apply stage05-main-rebased.patch
npm ci
npm run test:material-flow
npm run test:studio-ux
npm run test:security-regressions
npm run test:garp-security
npm run build
npm run qa:ecosystem
```
