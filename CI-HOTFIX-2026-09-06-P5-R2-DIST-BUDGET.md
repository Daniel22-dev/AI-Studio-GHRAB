# AI Studio GHRAB 0.21.44 — CI hotfix P5 R2 dist budget

## Selhání v GitHub Actions

- workflow: QA / P5 R2 release gate
- kontrola: `budget.distBytes`
- naměřeno: `2 252 019 B`
- limit: `2 250 000 B`
- rozdíl: `+2 019 B`

4K prezentační film nebyl příčinou tohoto failu: byl klasifikován jako lazy media a jeho samostatné limity prošly.

## Oprava

Performance limit se nezvyšuje. `scripts/build.mjs` po buildu kompaktně serializuje další strojově čitelné JSON konfigurace v `dist`. Zdrojové soubory zůstávají formátované pro člověka; mění se pouze whitespace distribuční kopie.

Kompaktované runtime JSONy navíc:

- `config/data-manifest.json`
- `config/permissions.json`
- `config/presentation.json`
- `config/release-acceptance.json`
- `config/security-headers.json`
- `config/brand-manifest.json`
- `config/ai-core.json`
- `config/ai-runtime.json`
- `config/platform-manifest.json`

## Verze

Zůstává `0.21.44`, protože původní publish kandidát skončil v CI před nasazením.
