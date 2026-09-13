# FINAL VALIDATION — AI Studio GHRAB 0.21.63

Datum: 2026-09-13

## Opravený incident
Denní `qa-build` končil v `qa:ecosystem:verified` na `activity-builder: wave version drift (0.5.27 != 0.5.22)` s důvodem `NOT_ENROLLED`. Sekundární `QA report missing` nebyl příčinou, ale důsledkem předčasně ukončeného hlavního QA jobu.

## Změna
- ACTIVA 0.5.27 a SORTIO 1.1.17 jsou explicitně zařazeny do GARP 2.5.1 SHIELD-PREP auto-patch policy.
- Release-wave baseline je srovnán na ACTIVA 0.5.27 a SORTIO 1.1.17.
- Registry snapshot/fallback jsou srovnány na stejné verze.
- Regression test promotion policy nyní vyžaduje `current >= minimumVersion`, nikoli trvalou rovnost s enrollment baseline.
- Nezařazené aplikace zůstávají fail-closed v režimu `manual`.

## Lokální ověření
- `test-release-promotion.mjs`: PASS
- `sync-platform-consumers.mjs --check`: PASS
- `sync-doc-app-versions.mjs --check`: PASS
- `qa-ecosystem.mjs`: PASS
- `verify-ai-core.mjs`: PASS
- `test.mjs`: PASS
- `test-studio-ux.mjs`: PASS
- GARP security regressions: 19/19 PASS
- GHRAB Platform conformance: 207/207 PASS
- P5 lock audit: PASS
- format-check hermetic fallback: PASS

Plný síťový `qa:ecosystem:verified` se provede v GitHub Actions po synchronizaci skutečně nasazených manifestů; lokální prostředí nemá síťový přístup na GitHub Pages.
