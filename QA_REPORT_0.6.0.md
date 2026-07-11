# QA report – AI Studio GHRAB 0.6.0

## Rozsah

- syntaxe všech JavaScriptových modulů,
- platnost všech JSON konfigurací,
- úplnost registru a ikon,
- soulad oprávnění s registry aplikací,
- import veřejného EC P-256 klíče,
- ověření podpisového algoritmu WebCrypto,
- zákaz soukromého klíče a přístupových souborů ve veřejném zdroji i buildu,
- hloubková validace všech ukázkových materiálů,
- bezpečný anonymní export,
- vnitřní odkazy a lokální assety HTML,
- správcovské brány,
- PWA precache a distribuční sestavení,
- kontrola nezaměněných verzovacích tokenů.

## Funkční scénáře

1. Bez oprávnění jsou aplikace uzamčené.
2. Učitelské oprávnění odemyká pouze vybrané aplikace.
3. Správcovské oprávnění odemyká všechny aplikace a správcovské stránky.
4. Neplatný, expirovaný nebo zneplatněný soubor je odmítnut.
5. Přímé adresy jsou chráněny po integraci bootstrapu do cílových repozitářů.
6. Import poškozeného nebo nadlimitního materiálu je odmítnut se srozumitelnou chybou.
7. Report neexportuje obsah materiálů, prompty ani volné poznámky.

## Známé hranice bezserverové etapy

Bez serveru nelze spolehlivě ověřit totožnost držitele ani zabránit sdílení platného přístupového souboru. Centrální audit a okamžité řízení účtů budou součástí serverové verze.

## Výsledek závěrečné kontroly

- Distribuční build verze `0.6.0`: **prošel**.
- Kompletní automatická sada `npm test`: **prošla bez chyby**.
- Kryptografická kontrola páru klíčů a správcovského oprávnění pomocí WebCrypto: **prošla**.
- Kontrola veřejného buildu na přítomnost soukromého klíče, správcovského přístupu a nezaměněných verzovacích tokenů: **prošla**.
- Anonymní stav rozhraní: **4 viditelné aplikace, 4 uzamčené, správcovská navigace skrytá, bez chyb stránky**.
- Správcovský stav rozhraní: **4 aplikace odemčené, správcovská navigace dostupná, bez chyb stránky**.
- Správcovské centrum: **6 řídicích karet, 4 připojené aplikace, bez chyb stránky**.
- Vizuální kontrola anonymní domovské stránky, správcovské domovské stránky a řídicího centra: **prošla**.

Prohlížeč v kontrolním kontejneru nepovolil přímé otevření lokální HTTP adresy. Vizuální a stavové testy proto proběhly v izolovaném prohlížečovém harnessu; kryptografický podpis byl navíc nezávisle ověřen v Node WebCrypto. Po nasazení na GitHub Pages je nutné podle release checklistu provést ještě krátký smoke test na skutečné HTTPS adrese.
