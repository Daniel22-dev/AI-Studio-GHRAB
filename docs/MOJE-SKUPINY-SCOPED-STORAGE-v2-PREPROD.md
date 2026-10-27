# MOJE SKUPINY — account-scoped storage v2 (preproduction only)

**State:** Proposed contract, NOT ENABLED for school rosters. Maintained on Studio DRAFT PR #336. GIT Stage08 PR #138 remains separate and DRAFT. Do not deploy/merge by treating isolated source tests as release approval.

## Finding / threat model

Studio v1 canonical group data is stored under one browser-origin-wide `localStorage` key `ghrab.ai-studio.groups.v1`. A second teacher using the *same browser profile* can encounter the first teacher's list. The new UI signed-access gate prevents casual unauthenticated page display, but does not prevent cross-account access after another valid login to the same profile and does not protect other consumers that import the unguarded `createGroupsService()` API.

This is student personal data. Use synthetic names and `.invalid` e-mail addresses in public commits, PRs and CI evidence.

## Staged v2 technical contract

New **opt-in** `createPrincipalGroupsSession({ getSnapshot, isPreview, storage, cryptoApi, ...})` in `src/groups/group-service.js`:

- Requires previously verified Studio access snapshot: valid and ready, supported role, nonempty stable `permit.sub`, no colleague preview, nonexpired permit.
- Pins the principal and `signed-permit` / `server-session` mode for that page instance; if revoked or changed, the instance is permanently disabled.
- Uses Web Crypto **SHA-256** over a domain-separated mode + subject to derive a stable, hashed v2 storage-key suffix. No plaintext subject in the storage key. Each principal sees its own data namespace through this API.
- Distinct modes intentionally use distinct namespaces: server migration requires a reviewed import, not an undocumented silent copy.
- **Does not read, copy, adopt, remove or mutate legacy v1 roster data**; exposes only a boolean `legacyStorePresent` to signal a migration need.
- `service.exportBackup()` produces a `ghrab-teaching-groups-account-backup-v2` with an opaque scope **label**. `importBackup()` rejects mismatched scope labels and legacy unbound v1 archives. **The label is not signed or authenticated**: deliberate editing can forge it, so this is a consistency guard rather than proof of ownership. A separate owner-verified migration procedure is needed for v1 backups.
- Retains existing group, member, revision and roster-projection schemas. The original v1 `createGroupsService()` remains untouched while other consumers are migrated.

**Crucial limitation:** SHA-256 is a deterministic *namespace*, not encryption. The original and v2 data remain plaintext in the browser origin. Same-origin scripts, browser developer tools, any malicious script or a different person with the same local browser profile can inspect storage outside this API. Browser-side scope pinning is not a substitute for backend account authorization or encryption with a secret unavailable to other users.

## Cross-application dependency matrix (direct v1 consumers)

| App | Existing integration | Required before enabling v2 |
| --- | --- | --- |
| AI Studio / Moje skupiny | `src/groups/groups.js`, local v1 provider | Update to v2 gated session; render migration needed instead of silently importing legacy v1 |
| SORTIO | `src/lazy/central-groups.js` | Switch to v2 authorized reader; verify canonical IDs/revisions and old link/merge behavior |
| Hodnotitel maturitních slohů | `src/js/26-central-groups.js` | Switch to v2 reader; preserve supervised student-recipient pairing, archive status and distribution holds |
| Lesson Hub | `src/integration/centralGroupsClient.js` | Switch to v2 metadata-only reader, preserve canonical link transactions |
| GIT 7.1.102 Stage08 | `src/features/central-groups.js` in PR #138 | Switch to v2 reader with actual verified Studio principal; preserve full roster, codes, result-ledger separation and Strict Mode |

Do not switch only the Studio writer: doing so would make legacy consumers appear to have lost their groups. Do not leave a silent v1 fallback in updated consumers because it reintroduces cross-teacher exposure.

## Legacy migration: fail closed, no guessing ownership

1. Before a coordinated release, **original teacher** exports their v1 backup from their original verified session on their controlled browser profile. Keep backups in approved school storage; do not upload them to public CI, PRs or student devices.
2. Review backup ownership with the school controller / administrator. Current v1 format has **no authenticated owner binding**. The system MUST NOT infer ownership from e-mail strings, group titles, a current signed-in account, or browser possession.
3. Introduce a separately reviewed **explicit one-time migration tool** with owner confirmation and auditable local-only transfer of a validated v1 backup into the selected v2 scope; preserve `groupId` and `memberId` and use no network telemetry. This migration tool **has not yet been implemented**.
4. Verify group counts, members, archive state, revision and link continuity in *all* consumers. Keep an encrypted/offline school-approved backup until completion.
5. Only after signed acceptance can obsolete shared v1 browser storage be deleted under a documented cleanup procedure. No automatic deletion during this draft.

## Test/release gates

Isolated Node regression tests: A vs B isolation via v2 service, role/expiry/account switch denial, stable IDs, legacy nondisclosure, mode transition and v2 scoped backup re-import; wrong scope/legacy archive rejection, crypto unavailable. Existing browser UI lock tests with synthetic data: 6/6 previously passed on exact source SHA `c81e65f`; they do not test v2 activation, real school accounts, or physical devices.

**Blocking:** full final SHA CI/GARP/P5, safe candidate/main topology and version/logbook governance, all four external consumer updates, real Safari/iPad/Android teacher UAT, live Forms, a written school data ownership/migration decision and explicit owner authorization. Remove the temporary feature-only QA workflow before protected promotion.

**Interim policy:** No shared browser profiles with real pupil rosters. Enforce separate teacher-controlled profiles/devices, approved sensitive-backup storage and manual sign-out; do not claim full isolation from local attackers.

## Rollback

If any consumer loses group access after v2 adoption, stop the rollout. Do not delete v1 data or silently re-enable v1 fallback to solve a failing integration. Restore the last certified candidate/main and use the approved teacher backup in a controlled recovery workflow. Validate results and all canonical IDs before reopening classes.
