# AI Studio GHRAB

**Verze 0.6.1 — profesionální serverless rozcestník s dokončenou ochranou přímých adres aplikací.**

AI Studio GHRAB je centrální brána školních digitálních a AI nástrojů. Jednotlivé aplikace zůstávají v samostatných repozitářích; Studio zajišťuje společnou navigaci, Top 4, synchronizaci verzí, pracovní materiály, bezpečnostní rámec, pilotní měření a správu přístupů.

## Hlavní novinky 0.6.1

- Přímé adresy všech čtyř aplikací nyní ověřují stejný podepsaný přístup jako AI Studio.
- Opraveno bezpečné sestavení odkazu zpět do Studia na zamykací obrazovce.
- Centrální registr odpovídá verzím Generátor 7.0.6, Diferenciátor 1.0.3, LUDUS 1.14.3 a Korespondenční asistent 4.0.3.

- digitálně podepsaná oprávnění místo veřejného demonstračního zámku,
- výchozí stav všech aplikací **uzamčeno**,
- odemykání jednotlivých aplikací podle absolvovaných školení,
- samostatná stránka **Můj přístup** a lokální administrátorský vydavatel oprávnění,
- oddělené učitelské a správcovské rozhraní,
- integrační ochrana přímých adres všech čtyř aplikací,
- přepracovaná domovská stránka při zachování sci-fi herního stylu a Top 4,
- výukový workflow oddělený od komunikace a administrativy,
- hlubší validace importovaných materiálů,
- přesnější lokální pilotní metriky,
- rozšířená diagnostika, PWA cache a release kontroly.

## Přístup bez serveru

Veřejný portál obsahuje pouze veřejný EC P-256 klíč. Správce vytvoří podepsaný přístup na stránce `tools/access-issuer/` pomocí soukromého klíče uloženého mimo repozitář. Oprávnění určuje roli, povolené aplikace, datum platnosti a verzi školení.

Bez serveru nelze spolehlivě ověřit totožnost držitele ani zabránit předání platného souboru. Jde o profesionální přechodové řešení před školním přihlášením, nikoli o plnou identitní službu.

## Ochrana přímých adres

Ve verzích Generátor 7.0.6, Diferenciátor 1.0.3, LUDUS 1.14.3 a Korespondenční asistent 4.0.3 je ochranný bootstrap již vložen přímo do aplikací. Stejný podepsaný přístup se proto ověřuje při spuštění z karty i při otevření přímé URL. Postup pro budoucí aplikace je v `src/integration/README.md`.

## Data a soukromí

Koncepty, materiály, oprávnění a pilotní záznamy zůstávají v konkrétním profilu prohlížeče. Nejde o centrální databázi ani zálohu. Do Studia patří pouze anonymní, veřejný nebo smyšlený obsah. Pilotní exporty neobsahují prompty, texty materiálů, jejich názvy ani volné poznámky.

## Nasazení

1. Nahrajte obsah `AI-Studio-GHRAB-v0.6.1-GitHub.zip` do kořene repozitáře.
2. Soukromý administrátorský balíček nikdy nenahrávejte na GitHub.
3. Po nasazení načtěte na stránce Můj přístup správcovské oprávnění.
4. Ve Správě spusťte Kontrolu Studia.
5. Nasaďte chráněné verze dílčích aplikací podle dokumentu `NAHRANI-NA-GITHUB-v0.6.1.md`.

Podrobný návod: `NAHRANI-NA-GITHUB-v0.6.1.md`.

## Lokální kontrola

```bash
npm run sync:offline
npm test
```

## Dokumentace

- `ARCHITEKTURA.md`
- `BEZPECNOST.md`
- `ROADMAP-SERVER.md`
- `RELEASE-CHECKLIST.md`
- `KOMENTAR-ZMEN-0.6.1.md`
- `QA_REPORT_0.6.1.md`
- `NAHRANI-NA-GITHUB-v0.6.1.md`

Autor a vývojový garant: Daniel Baláž  
Školní projekt Gymnázia, Ostrava-Hrabůvka
