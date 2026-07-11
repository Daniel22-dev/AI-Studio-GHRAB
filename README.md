# AI Studio GHRAB

**Verze 0.6.3 — federovaný serverless portál pěti chráněných školních aplikací.**

AI Studio GHRAB je centrální brána školních digitálních a AI nástrojů. Jednotlivé aplikace zůstávají v samostatných repozitářích; Studio zajišťuje společnou navigaci, Top 4, synchronizaci verzí, bezpečnostní rámec, pracovní materiály, pilotní měření a správu podepsaných přístupů.

## Hlavní novinky 0.6.3

- připojen **Hodnotitel maturitních slohů 1.3.2** jako pátá aplikace;
- nové aplikační ID `essay-evaluator`, školení `HOD-01` a claim `app.essay-evaluator.use`;
- Hodnotitel je ve výchozím Top 4, LUDUS zůstává v katalogu a lze jej připnout;
- doplněna lokální ikona, živý manifest, offline fallback, PWA cache a diagnostika;
- vydavatel oprávnění automaticky nabízí všech pět aplikací;
- synchronizace zachovává důvěryhodné lokální ikony portálu;
- sladěn repository dispatch Hodnotitele s automatickou aktualizací Studia.

## Přístup bez serveru

Veřejný portál obsahuje pouze veřejný EC P-256 klíč. Správce vytvoří podepsaný přístup na stránce `tools/access-issuer/` pomocí soukromého klíče uloženého mimo repozitář. Oprávnění určuje roli, povolené aplikace, datum platnosti a verzi školení.

Bez serveru nelze spolehlivě ověřit totožnost držitele ani zabránit předání platného souboru. Jde o přechodové řešení před školním přihlášením, nikoli o plnou identitní službu.

## Ochrana přímých adres

Ochranný bootstrap je integrován v Generátoru, Diferenciátoru, Hodnotiteli maturitních slohů, LUDUSu a Korespondenčním asistentovi. Stejný podepsaný přístup se ověřuje při spuštění z karty i při otevření přímé URL.

## Důležité po aktualizaci

Starší učitelské přístupy neobsahují `essay-evaluator`. Pro učitele, kteří mají Hodnotitel používat, vydejte nový přístup se zaškrtnutým Hodnotitelem a absolvovaným školením `HOD-01`. Správcovský přístup s `apps: ["*"]` otevře i novou aplikaci automaticky.

## Nasazení

1. Nahrajte obsah ZIPu AI Studia 0.6.3 do kořene repozitáře `AI-Studio-GHRAB`.
2. Nahrajte obsah ZIPu Hodnotitele AI-STUDIO-READY do kořene repozitáře `Hodnotitel-maturitnich-slohu`.
3. Soukromý administrátorský balíček ani přístupové soubory nikdy nenahrávejte na GitHub.
4. Po zeleném nasazení otevřete Správu a spusťte Kontrolu Studia.
5. Vydejte nové učitelské přístupy s oprávněním `essay-evaluator`.

## Lokální kontrola

```bash
npm run sync:offline
npm test
```

Autor a vývojový garant: Daniel Baláž  
Školní projekt Gymnázia, Ostrava-Hrabůvka
