# AI Studio GHRAB 0.20.2 — oprava readiness testu po živé synchronizaci

## Důvod vydání

Synchronizace po nasazení KS 5.9.1 správně načetla všech osm živých manifestů a označila KS jako `ready`. Release gate však stále obsahovala regresní test z přednasazovací fáze, který očekával stav `certified-pending-deployment`, a proto zcela správný výsledek falešně odmítla.

## Provedené změny

- test odvozuje očekávaný stav KS z aktuálně načteného manifestu;
- podporuje stav `ready`, `certified-pending-manifest` i `certified-pending-deployment` podle skutečné situace;
- souhrnné počty readiness se ověřují proti jednotlivým řádkům reportu;
- při živém stavu se kontroluje verze KS 5.9.1, Core 1.0.0, osm operací, konformita a HTTPS registr operací;
- funkce Studia, Core, Migration Kit i výchozí provoz `direct-gemini` zůstávají beze změny.

## Nasazení

Nahrajte obsah zdrojového balíčku 0.20.2 do kořene repozitáře AI Studia, proveďte commit a push do větve `main`. Workflow znovu synchronizuje živé manifesty a KS 5.9.1 může být bezpečně veden jako nasazený.
