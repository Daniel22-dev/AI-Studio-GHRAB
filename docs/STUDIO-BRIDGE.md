# Studio Bridge 1.1 a Access Guard

## Studio Bridge

Lokální integrační vrstva čte `ghrab-handoff-v1`, ověří cíl, expiraci a základní tvar materiálu, předávku po převzetí odstraní a poskytne návratový odkaz do Studia. Nic neposílá na server.

## Access Guard

`access/app-guard.js` je samostatná vrstva spuštěná před Bridgem a před vlastním kódem aplikace. Ověří podpis, časovou platnost, revokaci, roli a konkrétní `appId`. Při neúspěchu zobrazí uzamčenou obrazovku; při úspěchu bootstrap načte původní aplikaci.

## Doporučený životní cyklus

1. Access Guard ověří oprávnění.
2. Bootstrap načte hlavní modul aplikace.
3. Studio Bridge převezme případný handoff.
4. Aplikace zmapuje anonymní materiál do vlastního formuláře.
5. Handoff se odstraní.
6. Uživatel dostane informaci o importu a odkaz zpět.

## Bezpečnost

Oprávnění ani handoff nejsou náhradou serverového přihlášení. Handoff není šifrovaný a patří do něj pouze anonymní, veřejný nebo smyšlený obsah. Přístupový soubor lze bez serveru předat jiné osobě; tento limit je v rozhraní i dokumentaci výslovně uveden.
