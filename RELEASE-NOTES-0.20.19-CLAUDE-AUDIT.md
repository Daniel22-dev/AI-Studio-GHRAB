# AI Studio GHRAB 0.20.19 — ověřené opravy po nezávislém auditu

Datum: 9. 8. 2026

Toto vydání vychází z nezávislého reportu pro 0.20.17 a z následné kontroly skutečného zdrojového balíku 0.20.18. Nálezy nebyly přebírány automaticky: každý zásah byl ověřen proti aktuálnímu kódu a u sporných bodů byla zvolena konzervativnější varianta.

## Potvrzené P0 opravy

- **K1 — offline start:** `app-guard.js`, `access-control.js` a `platform-runtime.js` jsou network-first s cache fallbackem. Konfigurace/API zůstávají runtime-only. Browser QA obsahuje samostatný offline-start scénář s osmi kartami.
- **K2 — release gate:** odstraněna vakuová podmínka založená na chybějícím `summary.failed`. Report je přijat jen při skutečném `status: passed`; volitelné `not-ready-environment` je viditelné a tolerované pouze u nepovinných reportů. Přidán policy self-test s uměle vadnými vstupy.
- **K3 — axe:** CI používá `qa:axe:required` a release kontrolu `--require-axe`. Chybějící nebo nespustitelné axe prostředí v CI je fail-closed.
- **K4 — school-server build:** nepoužívaný `runtime-config.js` kontrakt byl odstraněn místo vytvoření mrtvého souboru. Po profilových změnách se precache prořeže podle skutečného výstupu; šablony `-p0` a `example` se nebalí; fáze a feature flagy se odvozují z consumer/deployment kontraktu.
- **K5 — bezpečnostní hlavičky:** CSP nemá `unsafe-inline` pro skripty ani styly, školní profil má HSTS a projektový bezpečnostní validátor porovnává statickou CSP se skutečnou meta CSP. HSTS je záměrně bez `includeSubDomains`, protože audit neprokazuje správu všech školních subdomén.

## Potvrzené P1 opravy

- **Z1:** prepaint čte nejdřív kanonický klíč `ghrab.ai-studio.motion.v1`, potom legacy klíč.
- **Z2:** souhrn synchronizace reaguje na každou změnu jazyka, ne pouze na první.
- **Z3:** zastaralá P4 kopie consumeru v `src/` byla odstraněna; build explicitně kopíruje kanonický kořenový consumer ještě před precache validací.
- **Z4:** zdrojový PWA manifest deklaruje platformu 1.1.0 a rozsah `>=1.1.0 <2.0.0`; conformance gate kontroluje zdroj i výsledný manifest.
- **Z5:** doplněny verze 0.20.10–0.20.13 a generátor changelogu odmítne release note bez odpovídající položky.
- **Z6:** aktuální verze osmi aplikací se synchronizují do dokumentace z registru a `qa:doc-versions` kontroluje odchylky.
- **Z7/Z8:** rozpočet precache má jediný zdroj pravdy v consumeru; deployment profily nejsou povinný precache, runtime gate moduly naopak zůstávají v cache jako offline fallback. `config/changelog.json` byl vyřazen z instalačního precache, čímž finální rozpočet klesl přibližně na 1,68 MB z limitu 1,80 MB. Duplicitní `apps.generated/fallback` zůstávají kvůli odolnosti — jejich sloučení není podmínkou správnosti.
- **Z9:** integrační bootstrapy už nemají natvrdo GitHub Pages URL; Studio URL odvozují z deployment profilu / same-origin fallbacku.
- **Z10:** živá dokumentace a build používají etapu P5.
- **Z11:** kontrakt nyní pravdivě deklaruje pouze podporovaný dark theme. Světlý motiv se v tomto patchi neimplementuje.
- **Z12:** vizuální sada obsahuje 390×844 a auditní regrese hlídá přítomnost šířky 390 ve vizuální i runtime bráně. Sady nejsou mechanicky sjednoceny, protože měří odlišné vlastnosti.

## P2 / hygiena

- **D1:** vizuální brána loguje `item.message` místo neexistujícího `item.summary`.
- **D2:** odstraněny čtyři skutečně nevolané legacy QA skripty. `sign-access-bundle.mjs` zůstává a je dostupný jako `npm run access:sign`.
- **D3:** odstraněn rozbitý `reporter-bootstrap.js` a starý migration kit 1.0.2. Historický platformový release 1.0.0 zůstává ve zdrojovém archivu pro audit/rollback, ale produkční build už strom `src/platform/` nekopíruje do `dist/`.
- **D4:** plný P5 běh je automaticky právě jednou: na PR přes P5 workflow a na push `main` uvnitř deploy workflow. Legacy P3/P4 a supplemental axe zůstávají ručně spustitelné.
- **D5:** denní cron zůstává; dokumentace obsahuje postup kontroly a ručního spuštění po delší neaktivitě.
- **D6:** aliasy npm skriptů nebyly odstraněny. Jsou levné a mohou být používány existujícími návody či návyky; jejich smazání nepřináší funkční opravu.
- **D7:** `credentials` pro statické same-origin JSON je zúženo na `same-origin`; startup overlay už nepřidává druhé `<h1>`. Čeština správcovských nástrojů je výslovně zdokumentované projektové rozhodnutí, nikoli chyba běžného dvojjazyčného UI.
  Dvojjazyčnost samostatných návodů `ecosystem-guide.html` a `error-report.html` zůstává jako neblokující obsahový backlog; v tomto bezpečnostním patchi se velké překlady nepřidávají.

## Nové regresní ochrany

- offline start v browser QA,
- self-test poctivosti release gate,
- povinné axe v CI,
- statický auditní regresní test,
- conformance PWA platform metadata,
- CSP shoda,
- spojitost changelogu,
- shoda dokumentovaných verzí aplikací,
- viewport 390 v obou relevantních branách,
- school-server validace precache a build-info.

## Poznámka k lokálnímu ověření

V auditním prostředí není možné dokončit instalaci `node_modules`, protože interní npm mirror neobsahuje `pngjs@7.0.0`. Testy bez této externí instalace a buildové/statické brány lze spustit; browser/axe část musí definitivně potvrdit GitHub Actions s veřejným npm registrem a připnutým Playwright Chromium.
