# AI Studio GHRAB 0.21.72 — Performance Pack Phase C Validation

Datum validace: 2026-09-15

## Scope

Phase C byla omezena na build, PWA instalační cache, statické assety a hygienu reprodukovatelných build artefaktů. Navazuje na Performance Phase A 0.21.70 a Phase B 0.21.71. Nebyl proveden redesign ani oslabení security/platform kontraktů.

## Implementované změny

- Service-worker install cache používá explicitní kritické jádro + offline-essential allowlist; ostatní same-origin statické povrchy se cacheují on-demand přes existující runtime `cacheFirst()`.
- Statické moduly potřebné pro první offline restart byly povýšeny do `CORE_REQUIRED`.
- Error reporter a vybrané portálové assety zůstávají v best-effort offline-essential vrstvě.
- Těžké a sekundární sekce nejsou install-precache: manuály, Library, Workflow, Automation, Demo, Pilot, Safety, Report, Tools, API usage, test/integration/schema obsah, changelog a prezentační média.
- Osm app PNG ikon převedeno na lossless WebP; všech osm porovnání proti původním PNG: **AE = 0**.
- Šest PWA PNG ikon bezeztrátově překódováno; všech šest porovnání: **AE = 0**.
- Distribuční CSS má konzervativní build-time whitespace compaction mimo quoted strings.
- `dist-school-server/` je ignorovaný generovaný artefakt; byl před testem úplně odstraněn a `npm run build:school-server` jej znovu vytvořil jako kompletní **187souborový ~57MB** balík.
- Auditní testy byly upraveny tak, aby ověřovaly skutečný postavený `dist/sw.js`, nikoli dřívější implementační blacklist.
- Přidán deterministický `test:performance-phase-c`.
- `npm test` explicitně spouští build před testy, které ověřují výsledný `dist/sw.js`; test suite tedy není skrytě závislá na artefaktu z předchozího běhu.
- Precache budget zpřísněn na **1 250 000 B**.

## Before / After

| Metrika | 0.21.71 Phase B | 0.21.72 Phase C | Aktuální limit | Stav |
|---|---:|---:|---:|---|
| nemediální `dist` | 2 399 585 B | **2 302 564 B** | 2 400 000 B | PASS |
| critical entry | 499 290 B | **499 018 B** | 500 000 B | PASS |
| instalační precache | 1 763 319 B | **1 114 462 B** | **1 250 000 B** | PASS |
| precache asset count | 127 | **65** | — | PASS |
| lazy media celkem | 56 433 046 B | **56 433 046 B** | 65 000 000 B | PASS |
| největší lazy media soubor | 56 048 161 B | **56 048 161 B** | 60 000 000 B | PASS |

Phase C tedy odstranila **648 857 B (cca 36,8 %)** z instalační precache a **97 021 B (cca 4,0 %)** z nemediálního distribučního obsahu. Současně byl precache limit snížen z 1,8 MB na 1,25 MB; nebyl navýšen žádný stávající performance strop.

## Asset validace

- App icons: 213 821 B → 123 503 B, úspora **90 318 B**, pixelová shoda AE = 0.
- Vybrané PWA PNG: úspora **5 390 B**, pixelová shoda AE = 0.
- `sortio.svg` ponecháno beze změny.
- Prezentační video nebylo rekomprimováno ani kvalitativně degradováno.

## Regresní a bezpečnostní validace

Po bumpu na 0.21.72:

- `npm test`: **PASS**
- Čistý checkout test: po smazání `dist/`, `dist-school-server/`, `qa-results/` a `node_modules/` proběhl `npm test` od nuly a **PASS**; `dist/` byl vytvořen automaticky jako součást test chainu.
- Audit regressions: **57/57 PASS**
- Security regressions: **16/16 PASS**
- GARP security regressions: **19/19 PASS**
- Performance Phase A: **PASS**
- Performance Phase B: **PASS**
- Performance Phase C: **PASS** (`1 114 462 B / 1 250 000 B`; required 41, offline-essential 18)
- Studio UX: **PASS**
- Live presence: **PASS**
- API usage contract: **PASS**
- Maturita Desk external launcher: **PASS**
- Task workflow: **PASS**
- `npm run verify:platform`: **207/207 PASS**
- `npm run qa:quality`: **194/194 PASS**, 0 warnings
- `npm run qa:lock`: **PASS**
- `npm run qa:xss`: **PASS**
- `npm run build:school-server`: **PASS**
- Audit regressions po vytvoření school-server buildu: **57/57 PASS**
- GARP security po vytvoření school-server buildu: **19/19 PASS**

## Reprodukovatelnost `dist-school-server`

Před testem byl `dist-school-server/` úplně smazán. `npm run build:school-server` nejprve vytvořil čerstvý `dist/` a následně z něj znovu sestavil `dist-school-server/` s 187 soubory a velikostí přibližně 57 MB. Build potvrdil lokální registr P5 a navazující audit/GARP testy prošly.

Proto `dist-school-server/` není autoritativní zdroj a ve finálním source ZIPu 0.21.72 nebude přiložen.

## Browser-runtime omezení tohoto prostředí

Browser-runtime kontrola **není označena jako PASS**.

`npm run qa:browser` v tomto prostředí končí před spuštěním browser testu, protože modul `playwright` není v lokálním pracovním prostředí instalovaný. Současně je systémový Chromium spravován politikou:

```json
"URLBlocklist": ["*"]
```

Tato politika blokuje lokální browser QA i v případě použití systémového Chromia. Závislosti ani organizační browser policy jsem neobcházel a nevytvářím falešný PASS.

Phase C proto má zelené deterministické build/PWA, platformní, bezpečnostní a statické performance brány; skutečný first-offline/browser acceptance je vhodné ještě provést v normálním CI nebo na školním PC bez uvedeného omezení.

## Migrační poznámka pro GitHub

`.gitignore` neodstraní adresář, který už je ve vzdáleném repozitáři trackovaný. Pokud GitHub stále obsahuje historický `dist-school-server/`, musí být při release 0.21.72 jednorázově odstraněn v commitu. Pouhé nahrání nového ZIPu bez tohoto adresáře starou vzdálenou kopii nesmaže.

## Závěr

Phase C 0.21.72 je z hlediska dostupných deterministických, platformních, bezpečnostních a statických performance bran zelená. PWA instalační stopa má nyní reálnou rezervu a je chráněna přísnějším budgetem. Critical entry zůstává záměrně pod původním 500kB limitem, ale stále těsně; jeho runtime měření a další performance enforcement patří do následující Phase D, nikoli do umělého zvyšování limitu.
