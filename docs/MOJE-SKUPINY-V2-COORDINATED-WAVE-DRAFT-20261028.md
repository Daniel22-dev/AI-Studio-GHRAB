# MOJE SKUPINY v2 — koordinovaná vydávací vlna (pracovní návrh, NO DEPLOY)

**Status: DRAFT / NO MERGE / NO DEPLOY.** Změny registru pouze deklarují *plánované* verze; neznamenají dostupnost na Pages nebo povolení reálných studentských dat.

## Návrh přesných kombinací

| Modul | Navržená verze | Zdrojový Draft |
| --- | --- | --- |
| AI Studio | 0.21.260 | [clean #342](https://github.com/Daniel22-dev/AI-Studio-GHRAB/pull/342) |
| Generátor interaktivních testů | 7.1.102 | [clean #141](https://github.com/Daniel22-dev/generator-testu/pull/141) |
| SORTIO | 1.1.24 | [dependent #49](https://github.com/Daniel22-dev/SORTIO/pull/49) |
| Lesson Hub | 1.2.28 | [dependent #27](https://github.com/Daniel22-dev/lesson-hub/pull/27) |
| Hodnotitel maturitních slohů | 1.5.32 | [dependent #55](https://github.com/Daniel22-dev/Hodnotitel-maturitnich-slohu/pull/55) |

Registry `src/config/platform-consumers.json` was updated only for the three consumer `version` and `cacheName` fields. Platform contract `1.1.2`, Student roster data, SSO, historical group IDs, public manifests and runtime logic remain unchanged.

## Release admission — hard NO-GO before all approvals

- Owner-approved signed teacher A/B school account testing with revocation and shared-device isolation;
- School controller attestation of ownership for every legacy v1 group backup, explicit v1→v2 migration and verified rollback;
- Complete independent GARP/P5/E10 on final exact release SHAs (review of all newly rotated policy trust anchors), signed versions and deployment-byte parity;
- Real school Forms/Sheets and authorized staff distribution tests (no public PII), physical Chrome/Edge, Android Chrome, iPhone/iPad Safari including multitasking;
- Coordinated release sequencing and rollback: fail-closed on version skew; never silently fall back to shared v1 provider; no automatic partial writer/reader rollout.

**Current live versions remain those in protected main.** These proposed registry values must not be promoted ahead of all consumers and explicit owner release authorization.
