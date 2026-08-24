# AI Studio GHRAB 0.21.32 — security + screenshot QA merge

## Výsledek

Jediný release spojuje kompletní bezpečnostně zkontrolovanou verzi 0.21.31 s opravou časového závodu produkčního screenshot testu.

## Zachované bezpečnostní změny

- rotovaný veřejný konfigurační ověřovací klíč a kryptograficky ověřený access bundle;
- nezměněný klíč pro uživatelská a správcovská oprávnění;
- 24hodinový limit od posledního online ověření a samostatný 30denní limit podepsaného bundle;
- fail-closed chování, shoda `sharedAccessVersion` a blokující release kontrola;
- veřejný trust anchor bez soukromého materiálu;
- nulový XSS sink baseline a GitHub Actions připnuté na plné SHA.

## Přenesená oprava

Screenshot se v původním logu správně vytvořil, ale test kontroloval `naturalWidth` dříve, než prohlížeč dokončil dekódování blob náhledu. Test nyní po vzniku karty čeká až čtyři sekundy na `complete && naturalWidth > 0` a do diagnostiky přidává `previewWaitMs`.

Skutečná chyba CSP zůstává blokující. Produkční reportér ani bezpečnostní konfigurace se touto opravou nemění.
