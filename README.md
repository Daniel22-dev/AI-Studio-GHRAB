# AI Studio GHRAB

**Verze 0.6.0 — profesionální serverless rozcestník s řízeným přístupem po školení.**

AI Studio GHRAB je centrální brána školních digitálních a AI nástrojů. Jednotlivé aplikace zůstávají v samostatných repozitářích; Studio zajišťuje společnou navigaci, Top 4, synchronizaci verzí, pracovní materiály, bezpečnostní rámec, pilotní měření a správu přístupů.

## Hlavní novinky 0.6.0

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

Studio samo chrání spuštění z karet. Aby nešlo zámek obejít přímou URL samostatné aplikace, musí být do jejího repozitáře vložen bootstrap z `src/integration/`. Přesný postup je v `src/integration/README.md`.

## Data a soukromí

Koncepty, materiály, oprávnění a pilotní záznamy zůstávají v konkrétním profilu prohlížeče. Nejde o centrální databázi ani zálohu. Do Studia patří pouze anonymní, veřejný nebo smyšlený obsah. Pilotní exporty neobsahují prompty, texty materiálů, jejich názvy ani volné poznámky.

## Nasazení

1. Nahrajte obsah `AI-Studio-GHRAB-v0.6.0-GitHub.zip` do kořene repozitáře.
2. Soukromý administrátorský balíček nikdy nenahrávejte na GitHub.
3. Po nasazení načtěte na stránce Můj přístup správcovské oprávnění.
4. Ve Správě spusťte Kontrolu Studia.
5. Ochranu přímých adres doplňte do repozitářů dílčích aplikací.

Podrobný návod: `NAHRANI-NA-GITHUB-v0.6.0.md`.

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
- `KOMENTAR-ZMEN-0.6.0.md`
- `QA_REPORT_0.6.0.md`
- `NAHRANI-NA-GITHUB-v0.6.0.md`

Autor a vývojový garant: Daniel Baláž  
Školní projekt Gymnázia, Ostrava-Hrabůvka
