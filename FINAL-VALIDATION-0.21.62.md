# FINAL VALIDATION — AI Studio GHRAB 0.21.62

Datum: 2026-09-12

## Důvod hotfixu
Po 0.21.61 byla hlášena pomalejší odezva navigace, pomalejší náběh Studia a chybějící možnost odstranit omylem založené rozepsané zadání.

## Zjištěné příčiny
1. Startup intro používalo klíč navázaný na konkrétní verzi a `sessionStorage`, takže se po patch release a v nových relacích znovu přehrávalo.
2. Service worker při instalaci nové verze spouštěl volitelné precache požadavky ve velké souběžné dávce a HTML navigace byla vždy network-first.
3. Report při renderu ihned kreslil oba A4 canvasy a při změnách reportovacích vstupů znovu načítal API usage; titulek spouštěl render po každém znaku.
4. Draft karta zadání neměla hard-delete akci.

## Provedené změny
- stabilní persistentní klíč `ghrab.startup-intro.seen.v1`; intro se po prvním zobrazení při běžném návratu neopakuje;
- volitelný PWA precache probíhá po dávkách po 4 souborech;
- již uložené HTML navigační cíle aktuální PWA verze používají cache-first s network fallbackem;
- rozcestník Reportu dává okamžitou aktivní odezvu;
- A4 preview je lazy podle viditelnosti, titulek používá debounce a API usage se v rámci stejného období znovu nenačítá;
- draft karta má `Smazat rozepsané zadání`; akce funguje i s neuloženým textem po potvrzení;
- hard delete je omezen na stav `draft`; uzavřené karty se pouze ruší/nahrazují kvůli auditní stopě.

## Ověření
- `npm test`: PASS
- audit regressions: **53/53 PASS**
- security regressions: **16/16 PASS**
- GARP security regressions: **19/19 PASS**
- Studio UX regression: PASS
- task workflow: PASS
- live presence: PASS
- API usage contract: PASS
- ecosystem gate: PASS
- GHRAB Platform conformance: **207/207 PASS**
- school-server build: PASS
- P5 static quality: **194/194 PASS**, 0 warnings

## Performance metriky
- `distBytes`: **2 394 991 / 2 400 000 B**
- `entryCriticalBytes`: **499 615 / 500 000 B**
- `precacheBytes`: **1 783 133 / 1 800 000 B**
- `largestFileBytes`: **199 533 / 200 000 B**
- žádný performance budget nebyl zvýšen.

## Browser gate
Lokální archiv neobsahuje nainstalovaný Playwright runtime, proto povinné browser/axe/reflow kontroly zůstávají součástí standardního GitHub Actions release gate po nahrání. Release postup s tím výslovně počítá.
