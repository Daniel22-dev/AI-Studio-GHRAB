# MOJE SKUPINY — account-scoped storage v2 (preproduction only)

**State as of 27 October 2026:** V2 writer and verified readers are IMPLEMENTED IN DRAFT BRANCHES ONLY, **NOT DEPLOYED**. Studio [Draft PR #336](https://github.com/Daniel22-dev/AI-Studio-GHRAB/pull/336) contains the editor, verified consumer, namespace and tests. Certified GIT E8 [Draft PR #138](https://github.com/Daniel22-dev/generator-testu/pull/138) remains untouched; v2 is a separate dependent [Draft PR #139](https://github.com/Daniel22-dev/generator-testu/pull/139). Do not merge/deploy based on branch-only tests.

## Finding / threat model

Studio v1 canonical group data is stored under one browser-origin-wide `localStorage` key `ghrab.ai-studio.groups.v1`. A second teacher using the *same browser profile* can encounter the first teacher's list. The new UI signed-access gate prevents casual unauthenticated page display, but does not prevent cross-account access after another valid login to the same profile and does not protect other consumers that import the unguarded `createGroupsService()` API.

This is student personal data. Use synthetic names and `.invalid` e-mail addresses in public commits, PRs and CI evidence.

## Staged v2 technical contract

**Enabled in the Draft Groups editor only** (never on production main/candidate). New `createPrincipalGroupsSession({ getSnapshot, isPreview, storage, cryptoApi, ...})` in `src/groups/group-service.js`:

- Requires previously verified Studio access snapshot: valid and ready, supported role, nonempty stable `permit.sub`, no colleague preview, nonexpired permit.
- Pins the principal and `signed-permit` / `server-session` mode for that page instance; if revoked or changed, the instance is permanently disabled.
- Uses Web Crypto **SHA-256** over a domain-separated mode + subject to derive a stable, hashed v2 storage-key suffix. No plaintext subject in the storage key. Each principal sees its own data namespace through this API.
- Distinct modes intentionally use distinct namespaces: server migration requires a reviewed import, not an undocumented silent copy.
- **Does not read, copy, adopt, remove or mutate legacy v1 roster data**; exposes only a boolean `legacyStorePresent` to signal a migration need.
- `service.exportBackup()` produces a `ghrab-teaching-groups-account-backup-v2` with an opaque scope **label**. `importBackup()` rejects mismatched scope labels and legacy unbound v1 archives. **The label is not signed or authenticated**: deliberate editing can forge it, so this is a consistency guard rather than proof of ownership. A separate owner-verified migration procedure is needed for v1 backups.
- Retains existing group, member, revision and roster-projection schemas. The original v1 `createGroupsService()` remains untouched while other consumers are migrated.

**Crucial limitation:** SHA-256 is a deterministic *namespace*, not encryption. The original and v2 data remain plaintext in the browser origin. Same-origin scripts, browser developer tools, any malicious script or a different person with the same local browser profile can inspect storage outside this API. Browser-side scope pinning is not a substitute for backend account authorization or encryption with a secret unavailable to other users.

## Cross-application v2 dependency matrix (all DRAFT / NO DEPLOY)

| Component | v2 staged branch / PR | Verified isolated evidence |
| --- | --- | --- |
| AI Studio / Moje skupiny | [PR #336](https://github.com/Daniel22-dev/AI-Studio-GHRAB/pull/336): `src/groups/groups.js` now uses guarded `createPrincipalGroupsSession()`; new `groups/verified-client.js` independently verifies signed Studio app access | [Studio isolated QA #40579603794](https://github.com/Daniel22-dev/AI-Studio-GHRAB/actions/runs/40579603794): 8/8 UI isolation + four cross-consumer projection checks PASS |
| SORTIO | [PR #46](https://github.com/Daniel22-dev/SORTIO/pull/46): v2 signed consumer; no direct shared global/provider access | [Isolated QA #40577171072](https://github.com/Daniel22-dev/SORTIO/actions/runs/40577171072): PASS |
| Hodnotitel maturitních slohů | [PR #53](https://github.com/Daniel22-dev/Hodnotitel-maturitnich-slohu/pull/53): verified v2 roster, recipient change hold unchanged | [Isolated QA #40577716974](https://github.com/Daniel22-dev/Hodnotitel-maturitnich-slohu/actions/runs/40577716974): 12/12 regression tests PASS |
| Lesson Hub | [PR #24](https://github.com/Daniel22-dev/lesson-hub/pull/24): verified v2 metadata-only, never receives student roster | [Isolated QA #40576575826](https://github.com/Daniel22-dev/lesson-hub/actions/runs/40576575826): 61/61 tests PASS |
| GIT 7.1.102 E8 | [PR #139](https://github.com/Daniel22-dev/generator-testu/pull/139): dependent v2 feature off the certified, untouched [PR #138](https://github.com/Daniel22-dev/generator-testu/pull/138) | [Isolated QA #40576735736](https://github.com/Daniel22-dev/generator-testu/actions/runs/40576735736): PASS |

**Integration coverage:** A synthetic Chromium test on the actual Studio `group-service.js` and `verified-client.js` creates one v2 group and reads projections as each consumer. It verifies identical `groupId/memberId` and revisions, no student e-mails for SORTIO, no roster for Lesson Hub, and explicit teacher switch denial. Its signed access control is stubbed: this is NOT full cross-repository browser UI, school account/UAT, cryptographic live permit proof, or server tenant isolation.

**Release is atomic by policy:** no partial Studio writer cutover. All consumers must be promoted in a coordinated approved wave; old v1 groups cannot silently reappear through a fallback. Standalone branch success is not GARP/P5 release certification.

## Legacy migration: fail closed, no guessing ownership

1. Before a coordinated release, **original teacher** exports their v1 backup from their original verified session on their controlled browser profile. Keep backups in approved school storage; do not upload them to public CI, PRs or student devices.
2. Review backup ownership with the school controller / administrator. Current v1 format has **no authenticated owner binding**. The system MUST NOT infer ownership from e-mail strings, group titles, a current signed-in account, or browser possession.
3. Introduce a separately reviewed **explicit one-time migration tool** with owner confirmation and auditable local-only transfer of a validated v1 backup into the selected v2 scope; preserve `groupId` and `memberId` and use no network telemetry. This migration tool **has not yet been implemented**.
4. Verify group counts, members, archive state, revision and link continuity in *all* consumers. Keep an encrypted/offline school-approved backup until completion.
5. Only after signed acceptance can obsolete shared v1 browser storage be deleted under a documented cleanup procedure. No automatic deletion during this draft.

## Test/release gates

Isolated Node regression tests: principal A vs B, role/expiry/account switch denial, stable IDs, legacy nondisclosure, mode transition, v2 scoped backup re-import, wrong-scope/legacy archive rejection and missing Web Crypto. Chromium Studio Groups UI: **8/8 PASS** on draft v2 writer; combined Studio writer-to-four-consumer projections: **4 positive checks PASS** in [run #40579603794](https://github.com/Daniel22-dev/AI-Studio-GHRAB/actions/runs/40579603794). The independent verified-client suite includes mocked positive access and unsigned-bundle rejection. Real signed teacher accounts, full cross-repo browser builds, iOS/iPadOS/Android and live Forms remain UNTESTED.

**Blocking:** full final SHA CI/GARP/P5, safe candidate/main topology and version/logbook governance, joint cross-app certification beyond isolated drafts, real Safari/iPad/Android teacher UAT, live Forms/Sheets and teacher-recipient checks, a written school data ownership/migration decision, server-grade confidentiality plan or enforceable isolated teacher browser profile policy, and explicit owner authorization. Remove the temporary feature-only QA workflow before protected promotion.

**Interim policy:** No shared browser profiles with real pupil rosters. Enforce separate teacher-controlled profiles/devices, approved sensitive-backup storage and manual sign-out; do not claim full isolation from local attackers.

## Rollback

If any consumer loses group access after v2 adoption, stop the rollout. Do not delete v1 data or silently re-enable v1 fallback to solve a failing integration. Restore the last certified candidate/main and use the approved teacher backup in a controlled recovery workflow. Validate results and all canonical IDs before reopening classes.
