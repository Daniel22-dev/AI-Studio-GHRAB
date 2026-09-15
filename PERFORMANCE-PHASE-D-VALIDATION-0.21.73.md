# AI Studio GHRAB 0.21.73 — Performance Phase D Validation

Datum: 2026-09-15

## Verdikt

**IMPLEMENTACE A NEBROWSEROVÉ REGRESE: PASS**

Phase D je implementačně dokončena. Statické performance budgety, Platform 1.1.2 konformance, bezpečnostní regrese, school-server build a Performance A–D regrese jsou zelené. Runtime performance benchmark je nově povinnou release bránou, ale jeho číselný výsledek nelze v tomto pracovním prostředí poctivě certifikovat, protože systémový Chromium má spravovanou globální `URLBlocklist: ["*"]`. Definitivní runtime PASS proto musí potvrdit existující GitHub Actions P5 gate s připnutým Playwright Chromium 1.61.1.

## Scope Phase D

1. Převést deklarované runtime performance budgety na skutečně měřenou a release-blocking bránu.
2. Vytvořit deterministický `render-ready` signál hlavního portálu.
3. Odlehčit kritickou vstupní cestu bez redesignu a bez degradace FULL vzhledu.
4. Vytvořit reálnou rezervu pod `entryCriticalBytes` bez zvýšení budgetu.
5. Zachovat výsledky Performance Phase A, B a C.

## Implementace

### Runtime performance enforcement

`scripts/qa-p5-runtime.mjs` nyní na referenčním profilu měří a vyhodnocuje:

- DOM nodes,
- render-ready time,
- JS heap used,
- layout duration do render-ready,
- task duration do render-ready.

Referenční profil zůstává:

- viewport 1366 × 768,
- CPU slowdown ×4,
- memory class 4 GB.

Výsledky se porovnávají s `quality.runtimeBudget` v `ghrab-platform.consumer.json`.

`qa-p5-acceptance.mjs` explicitně vyžaduje:

- `runtimePerformance.status === "passed"`,
- `performanceFailures === 0`,
- `blockers === 0`.

Překročení runtime performance budgetu tedy nově zastaví release.

### Deterministický render-ready signál

- `startup-prepaint.js` zakládá `performance.mark("ghrab-studio-start")`.
- Hlavní portál po vykreslení použitelného stavu nastaví `data-studio-render-ready="true"`.
- Současně vzniká `performance.mark("ghrab-studio-render-ready")` a measure `ghrab-studio-render-ready-ms`.

Benchmark tak neměří arbitrární `load` event, ale okamžik, kdy je hlavní Studio skutečně použitelné.

### Deferred portal gateway

Velký 760×760 gateway asset již není parserem vyžádán jako součást prvního kritického request setu.

- zachovány intrinsic dimensions 760×760,
- `decoding="async"`,
- `fetchpriority="low"`,
- načtení proběhne po prvním použitelném renderu,
- FULL vizuální podoba není odstraněna ani zjednodušena.

## Statické BEFORE / AFTER

| Metrika | 0.21.72 před Phase D | 0.21.73 po Phase D | Výsledek |
|---|---:|---:|---:|
| Critical entry | 499 018 B | **359 637 B** | **−139 381 B / −27,9 %** |
| Critical-entry limit | 500 000 B | **420 000 B** | limit zpřísněn |
| Rezerva critical entry | 982 B | **60 363 B** | zásadní rezerva |
| Nemediální dist | 2 302 564 B | **2 304 343 B** | +1 779 B |
| Precache | 1 114 462 B | **1 115 695 B** | +1 233 B |
| Precache limit | 1 250 000 B | **1 250 000 B** | beze změny |

Malý růst celkového `dist` a precache je způsoben novou runtime QA/instrumentační logikou; kritická startup cesta přesto klesla přibližně o 28 %.

## Finální statické budgety 0.21.73

- `distBytes`: **2 304 343 / 2 400 000 B**
- `entryHtmlBytes`: **15 977 / 50 000 B**
- `entryCriticalBytes`: **359 637 / 420 000 B**
- `largestInlineScriptBytes`: **2 461 / 30 000 B**
- `precacheBytes`: **1 115 695 / 1 250 000 B**
- `largestFileBytes`: **140 614 / 200 000 B**
- `duplicateLargeBytes`: **32 663 / 260 000 B**
- lazy media total: **56 433 046 / 65 000 000 B**
- largest lazy media: **56 048 161 / 60 000 000 B**

P5 quality: **194/194 PASS, 0 warnings**.

## Regresní výsledky

Finální `npm test` po bumpu na 0.21.73: **EXIT 0**.

- audit regressions: **57/57 PASS**
- security regressions: **16/16 PASS**
- GARP security regressions: **19/19 PASS**
- release promotion policy: **PASS**
- Studio UX/regression: **PASS**
- Live presence: **PASS**
- API usage: **PASS**
- Maturita Desk external launcher: **PASS**
- task workflow: **PASS**
- Performance Phase A: **PASS**
- Performance Phase B: **PASS**
- Performance Phase C: **PASS**
- Performance Phase D: **PASS**

Platform 1.1.2 conformance: **207/207 PASS**.

## School-server profil

`npm run build:school-server` na 0.21.73 vytvořil znovu kompletní artefakt:

- **187 souborů**,
- přibližně **57 MB**.

Následně:

- audit regressions: **57/57 PASS**,
- GARP security regressions: **19/19 PASS**.

Phase D tedy nerozbila reprodukovatelný school-server build.

## Runtime benchmark — stav ověření

Lokální `npm run qa:runtime` nelze v tomto pracovním prostředí validně dokončit. Systémový Chromium je spravovaný politikou:

```json
"URLBlocklist": ["*"]
```

a lokální HTTP QA stránka je browserem blokována. Tento environmentální limit nebyl obcházen a výsledek není vydáván za PASS.

Projekt však již má v GitHub workflows správné prostředí pro definitivní gate:

- `playwright` je připnutý na **1.61.1**,
- workflow instaluje `playwright chromium`,
- nastavuje `CHROMIUM_PATH`,
- `qa:p5:ci` obsahuje `qa:runtime`,
- acceptance gate nyní vyžaduje runtime performance PASS.

**Produkční promotion 0.21.73 proto musí proběhnout pouze tehdy, pokud GitHub P5 release gate vrátí runtime benchmark PASS.**

## Bezpečnost a kompatibilita

Phase D:

- nemění GHRAB Platform kontrakt,
- nemění AI Core kontrakt,
- nemění access-control logiku,
- nemění CSP z důvodu performance,
- nezvyšuje performance limity,
- neodstraňuje FULL vizuální režim,
- nenarušuje Phase A adaptive motion,
- nenarušuje Phase B scaling/rendering optimalizace,
- nenarušuje Phase C PWA/cache strategii.

## Definition of done

- [x] skutečný render-ready signál
- [x] runtime budgets napojené na existující P5 runtime QA
- [x] runtime performance je release-blocking
- [x] kritická cesta odlehčena bez redesignu
- [x] entry budget zpřísněn, nikoli zvýšen
- [x] ~60 kB rezerva critical entry
- [x] Phase A–D regression PASS
- [x] Platform 1.1.2 PASS 207/207
- [x] P5 quality PASS 194/194
- [x] audit/security/GARP regrese PASS
- [x] school-server build reprodukovatelný
- [ ] runtime číselný PASS v lokálním Chromium — environmentálně blokováno
- [ ] runtime číselný PASS v GitHub P5 gate — musí potvrdit CI před produkční promotion

## Závěr

Phase D je implementačně uzavřená. Největší předchozí statický problém — critical entry 499 018 / 500 000 B — je odstraněn a nyní činí 359 637 / 420 000 B. Zároveň už runtime performance není pouze deklarací v consumeru: je součástí release acceptance kontraktu. Finální produkční schválení 0.21.73 má být podmíněno zeleným GitHub P5 runtime benchmarkem.
