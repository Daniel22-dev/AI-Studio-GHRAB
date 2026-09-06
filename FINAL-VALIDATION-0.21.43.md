# FINAL VALIDATION – AI Studio GHRAB 0.21.43

Datum: 2026-09-06
Platforma: GHRAB Platform 1.1.2
Typ změny: CI/performance-budget hotfix bez změny bezpečnostního release-wave kontraktu

## Příčina pádu 0.21.42 na GitHub Actions

GitHub Actions úspěšně ověřil release-wave zdroje 9/9, bez snapshotů, a ecosystem gate prošel. P5 R2 gate následně skončil pouze na `qa:quality`:

- naměřeno `distBytes = 2 250 515 B`
- rozpočet `distBytes = 2 250 000 B`
- překročení = `515 B`

Ostatní budget položky v tomto běhu prošly.

## Oprava 0.21.43

`src/config/release-wave.json` je zdrojový build/CI manifest používaný `scripts/qa-ecosystem.mjs`. Browser runtime jej nepoužívá. Build jej v 0.21.42 po ověření zbytečně kopíroval do `dist`.

V `scripts/build.mjs` byl proto `release-wave.json` přidán mezi build-only konfigurace, které se po zpracování z distribučního `dist` odstraní. Performance budget nebyl zvýšen ani jinak oslaben.

Release-wave obsah, Platforma 1.1.2, 9/9 source verification pravidlo, zákaz snapshotu pro deploy a E-01 policy zůstávají beze změny.

## Lokální ověření

- `npm test` – PASS
- audit regressions – 50/50 PASS
- security regressions – 16/16 PASS
- GARP security regressions – 19/19 PASS, syntetická data
- release policy self-test – PASS
- Studio UX/regression – PASS
- Maturita Desk external-launcher regression – PASS
- `qa:lock` – PASS
- `qa:ecosystem` – PASS
- `verify:platform` – 203/203 PASS
- `qa:quality` – 188/188 PASS
- výsledný `distBytes` – 2 247 864 / 2 250 000 B
- `dist/config/release-wave.json` – nepřítomen, záměrně build-only

## NOT TESTED v lokálním prostředí

Kompletní browser/axe větev `qa:p5:ci` nebyla znovu lokálně dokončena, protože `npm ci` v sandboxu skončilo transportním timeoutem při stahování závislostí. Nejde o produktový FAIL. Přiložený GitHub log 0.21.42 již ukazuje, že běh došel přes předchozí QA kroky a následný P5 R2 gate se zastavil právě na jediném `budget.distBytes` FAILu. V 0.21.43 je tato konkrétní podmínka lokálně reprodukována jako PASS bez zvýšení rozpočtu.

## Release status

Kandidát 0.21.43 je připraven k novému GitHub Actions běhu. E-01 se tím automaticky neuzavírá; po zeleném deployi zůstává nutné společné post-deploy ověření celé Platform 1.1.2 release wave.
