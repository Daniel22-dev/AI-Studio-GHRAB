# AI Studio GHRAB 0.20.3 — systémová oprava readiness po změně verze aplikace

## Co skutečně selhalo

Živá synchronizace proběhla správně: všech osm manifestů bylo ověřeno a KS byl veden jako `ready`. Projektový test však obsahoval podmínku, že živě připravený Korespondenční asistent musí mít přesně verzi `5.9.1`. Po nasazení řádně otestované verze `5.9.3` proto test nesprávně očekával přechodový stav a release gate spadla.

Nešlo o chybu skloňování, GHRAB AI Core, registru operací ani nasazení KS. Šlo o zastaralou podmínku v AI Studiu.

## Oprava

- stav každé aplikace se odvozuje z aktuálního živého manifestu a certifikační baseline;
- `ready` vyžaduje `serverReady: true`, úspěšnou konformitu, aktivní Core a HTTPS registr operací;
- test už neporovnává živou verzi s jedním natvrdo zadaným číslem;
- souhrnné počty se kontrolují proti skutečným řádkům všech aplikací;
- registr spotřebitelů Core se kontroluje proti certifikovaným aplikacím, nikoli proti pevnému počtu;
- regresní sonda simuluje novější patch release a hlídá návrat stejné chyby;
- certifikační baseline byla aktualizována na KS 5.9.3 a obsahuje verzovaný důkaz testů.

## Ověření KS 5.9.3

- 135/135 interních testů;
- 17/17 GHRAB AI Core conformance testů;
- Core 1.0.0;
- kontrakt 1;
- osm veřejných AI operací;
- SHA-256 zdrojového balíku: `bacb31b21bf8a795ff6f9c22d4a197e51ee676b6377b06efb2927b7f6a69a95d`.

## Co se nemění

Uživatelské funkce AI Studia, GHRAB AI Core 1.0.0, Migration Kit 1.0.2, režim `direct-gemini`, přístupová politika a obsah dílčích aplikací zůstávají beze změny.
