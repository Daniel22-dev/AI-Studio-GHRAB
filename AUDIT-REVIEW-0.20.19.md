# Nezávislé posouzení Claude auditu — AI Studio GHRAB 0.20.19

Datum: 9. 8. 2026
Vstupní zdrojový balík: 0.20.18
Auditní report: původně cílený na 0.20.17
Výsledná verze: 0.20.19

## Verdikt

**READY FOR CI — ne finální GO.** Všechny lokálně spustitelné testy a buildové/statické brány jsou zelené. Finální browser/axe certifikace musí proběhnout v GitHub Actions, protože auditní kontejner blokuje všechny URL systémovou Chromium politikou a lokální instalace Playwright závislostí zde není spolehlivě dokončitelná.

## Posouzení nálezů

| ID | Verdikt | Zásah v 0.20.19 |
|---|---|---|
| K1 | Souhlas | Runtime přístupové moduly jsou network-first + cache fallback; konfigurace/API zůstávají network-only. Přidán offline browser regresní scénář. |
| K2 | Souhlas | Release gate přijímá required report jen při skutečném `passed`; přidán policy self-test se záměrně vadnými vstupy. |
| K3 | Souhlas | CI používá `qa:axe:required`; required axe bez prostředí končí nenulově. |
| K4 | Souhlas, jiná implementace K4a | Mrtvý `runtime-config.js` kontrakt byl odstraněn místo vytvoření nepoužívaného souboru. School build po změnách prořeže precache, odstraní p0/example profily a odvozuje P5/feature flagy. |
| K5 | Souhlas, konzervativnější HSTS | CSP bez `unsafe-inline`, automatická shoda meta/server profilu. HSTS `max-age=31536000` bez `includeSubDomains`, protože vlastnictví všech subdomén audit nedokládá. |
| Z1 | Souhlas | Prepaint čte kanonický motion klíč před legacy klíčem. |
| Z2 | Souhlas | Jazykový listener už není `once`. |
| Z3 | Souhlas | Stará P4 kopie consumeru odstraněna; build explicitně kopíruje kořenový P5 consumer před precache kontrolou. |
| Z4 | Souhlas | PWA platforma 1.1.0 + required range; conformance hlídá zdroj i build. |
| Z5 | Souhlas | Doplněny 0.20.10–0.20.13; release note bez changelog položky nově selže. |
| Z6 | Souhlas | Verze aplikací se synchronizují/checkují proti registru. |
| Z7 | Částečný souhlas | Sjednocen jediný budget; changelog vyřazen z instalačního precache (cca 1,68 MB / 1,80 MB). Duplicitní generated/fallback registr ponechán kvůli odolnosti. |
| Z8 | Souhlas | Runtime moduly jsou v required cache jako offline fallback; deployment profily se neprecachují. |
| Z9 | Souhlas | V aktuálním archivu je pět bootstrap příkladů (ne šest); všechny přestaly používat hardcoded GitHub URL a vyžadují deployment `studioBaseUrl`/explicitní override. |
| Z10 | Souhlas | Živá dokumentace a log build postprocessoru používají P5. |
| Z11 | Souhlas s variantou „pravdivý kontrakt“ | Consumer deklaruje jen `dark`; světlý motiv se v tomto patchi neimplementuje. |
| Z12 | Částečný souhlas | Přidáno 390×844 do visual QA a regresní kontrola 390 v obou branách. Sady se nesjednocují mechanicky, protože visual/runtime mají odlišný účel. |
| D1 | Souhlas | Visual log používá `item.message`. |
| D2 | Souhlas | Čtyři nevolané legacy QA skripty odstraněny; podpisový nástroj zachován a vystaven jako `npm run access:sign`. |
| D3 | Částečný souhlas | Rozbitý reporter bootstrap + migration kit 1.0.2 odstraněny. Historický platformový release 1.0.0 ponechán ve zdroji pro audit/rollback, ale celý starý `src/platform` strom už nejde do produkčního `dist`. |
| D4 | Souhlas | PR: jeden P5 workflow. Push `main`: P5 uvnitř deploy. Legacy P3/P4 a supplemental axe jsou pouze ruční. |
| D5 | Souhlas bez změny logiky | Cron ponechán; existující provozní dokumentace výslovně upozorňuje na deaktivaci po neaktivitě a ruční `Run workflow`. |
| D6 | Nesouhlas jako release oprava | Aliasy zůstávají kvůli zpětné kompatibilitě návodů/návyků; jejich odstranění by nepřineslo funkční ani bezpečnostní zlepšení. |
| D7 | Částečný souhlas | `credentials` -> `same-origin`, druhé `<h1>` odstraněno; čeština dvou admin nástrojů zdokumentována jako záměr. Překlad `ecosystem-guide.html` a `error-report.html` ponechán jako neblokující obsahový backlog. |

## Regresní ochrany přidané v tomto vydání

- `scripts/test-offline-start-browser.mjs` — offline start s osmi kartami;
- `scripts/qa-p5-release.mjs --policy-self-test` — ověřuje, že release gate umí skutečně selhat;
- `scripts/test-audit-regressions.mjs` — statická ochrana klíčových auditních oprav;
- `qa:axe:required` — povinný fail-closed axe režim;
- PWA platform version/range v `ghrab-platform-conformance.mjs`;
- CSP shoda v projektovém security validatoru;
- spojitost release notes ↔ changelog;
- kontrola dokumentovaných verzí aplikací;
- 390×844 ve visual QA;
- validace school-server precache/build-info.

## Lokální ověření finálního 0.20.19

- `npm test` — PASS;
- `npm run build` + postbuild platform conformance — PASS;
- `npm run qa:lock` — PASS;
- `npm run qa:quality` — PASS 155/155, 0 warnings;
- precache — 1 680 960 B / limit 1 800 000 B;
- `npm run qa:xss` — PASS;
- `npm run qa:security` — PASS, 0 findings;
- `npm run build:school-server` — PASS, P5, 111 precache entries, 0 missing;
- `npm run qa:axe:required` bez lokálních závislostí — očekávaný FAIL s blockerem (ověření fail-closed chování);
- browser/axe runtime s Chromiem — **NOT RUN / environment blocked**, musí potvrdit GitHub Actions.

## Co zůstává do backlogu

1. Dvojjazyčné zpracování samostatných návodů `manualy/ecosystem-guide.html` a `manualy/error-report.html`.
2. Případná další optimalizace precache (`apps.generated.json` vs `apps.fallback.json`, velký `portal-gateway.webp`) pouze pokud se budget znovu přiblíží limitu.
3. Odstranění npm aliasů jen jako samostatný breaking-cleanup krok, pokud se prokáže, že je nepoužívají návody ani externí automatizace.
