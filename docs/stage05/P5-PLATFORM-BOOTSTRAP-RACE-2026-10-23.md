# P5 platform bootstrap race — diagnostika a oprava (23. 10. 2026)

**Rozsah:** metadata inicializace platformy v AI Studiu, nikoli přístupová pravidla ani Material Flow. **Cíl:** odstranit falešně negativní, časově závislou kontrolu P5 bez oslabování testů.

## Důkaz problému

Při stejném kandidátském SHA `6b8bbbb50f5258a145b95dd68450c51ef832fb43` se paralelní běhy oficiálního P5 rozešly:

- [40021853858](https://github.com/Daniel22-dev/AI-Studio-GHRAB/actions/runs/40021853858) **PASS**.
- [40021861487](https://github.com/Daniel22-dev/AI-Studio-GHRAB/actions/runs/40021861487) **FAIL** v `scripts/test-platform-bootstrap-browser.mjs:73`: `unexpected wait state` (prázdný string). V tomtéž běhu předtím prošel offline-start browser test s 10/10 kartami.

V `src/access/app-guard.js` funkce `waitForLocalPlatformUnlock()` při **již inicializované platformě** vracela objekt platformy ihned bez nastavení atributu `data-ghrab-platform-unlock-wait`. Pomalá větev, která čekala na `ghrab:platform-ready`, atribut správně nastavovala na `ready`. Browser test očekával `ready` v obou případech; rychlejší init tedy způsoboval falešné selhání.

## Úzká oprava

- Pro chráněné skripty s již hotovým `unlockProtectedScripts` se před návratem nastaví `document.documentElement.dataset.ghrabPlatformUnlockWait = "ready"`. **Žádné udělení přístupu**; jde pouze o stavovou diagnostiku.
- Browser regresní test nyní deterministicky ověřuje **dvě pořadí:** platforma se inicializuje se zpožděním, nebo už je hotová před importem chráněného modulu. Veškeré původní fail-closed aserce a kontroly skutečného odemčení zůstávají.
- P3 candidate-PR kontrola syntakticky ověřuje změněný browser test bez instalace prohlížeče. Plný browser runtime běží až v oficiálním P5 po začlenění do `candidate`.

## Akceptace

1. CI review PR musí projít.
2. Oficiální P5 na *integrovaném* commitu musí potvrdit oba browser scénáře; hodnotit také paralelní běhy P5, nikoli selektivně jen zelený.
3. Úspěch této opravy neznamená úspěch autorizovaných importů do Generátoru, Diferenciátoru a LUDUS. Produkční vydání stále vyžaduje **6/6 skutečných autorizovaných E2E PASS** a schválenou Safe Promotion.
