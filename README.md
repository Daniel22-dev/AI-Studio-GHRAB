# AI Studio GHRAB

**Verze 0.7.3 — federovaný serverless portál pěti chráněných školních aplikací s interaktivními manuály otevřenými přímo uvnitř PWA.**

AI Studio GHRAB je centrální brána školních digitálních a AI nástrojů. Jednotlivé aplikace zůstávají v samostatných repozitářích; Studio zajišťuje společnou navigaci, Top 4, synchronizaci verzí, bezpečnostní rámec, pracovní materiály, pilotní měření a správu podepsaných přístupů.

## Hlavní novinky 0.7.3

- Manuály se v nainstalovaném AI Studiu otevírají v interním prohlížeči, takže uživatel nepřechází do nové karty běžného prohlížeče.
- Interní prohlížeč znovu ověřuje stejné podepsané oprávnění jako katalog manuálů.
- Aktuální obsah se stále načítá přímo z repozitáře dané aplikace; v AI Studiu nevzniká druhá kopie manuálu.
- Horní lišta nabízí návrat do katalogu, obnovení a nouzové otevření samostatně.
- Interaktivita a tlačítko celé obrazovky uvnitř manuálu zůstávají funkční.
- Opravena hlavní navigace z verze 0.7.1 a zachován přístup správce ke všem pěti průvodcům.
- Centrální registr obsahuje Generátor 7.0.8, Diferenciátor 1.1.1, Hodnotitel 1.3.7, Korespondenčního asistenta 5.0.1 a LUDUS 1.14.6.

## Přístup bez serveru

Veřejný portál obsahuje pouze veřejný EC P-256 klíč. Správce vytvoří podepsaný přístup na stránce `tools/access-issuer/` pomocí soukromého klíče uloženého mimo repozitář. Oprávnění určuje roli, povolené aplikace, datum platnosti a verzi školení.

Bez serveru nelze spolehlivě ověřit totožnost držitele ani zabránit předání platného souboru. Jde o přechodové řešení před školním přihlášením, nikoli o plnou identitní službu.

## Ochrana přímých adres

Ochranný bootstrap je integrován v Generátoru, Diferenciátoru, Hodnotiteli maturitních slohů, LUDUSu a Korespondenčním asistentovi. Stejný podepsaný přístup se ověřuje při spuštění z karty i při otevření přímé URL.

## Důležité po aktualizaci

Stávající podepsaná oprávnění není kvůli manuálům nutné vydávat znovu. Manuál automaticky dědí přístup k příslušné aplikaci. Správcovský přístup s `apps: ["*"]` otevře všechny průvodce.

## Nasazení

1. Nejprve musí být nasazené aktuální balíčky všech pěti dílčích aplikací s manuály.
2. Nahrajte obsah ZIPu AI Studia 0.7.3 do kořene repozitáře `AI-Studio-GHRAB`.
3. Soukromý administrátorský balíček ani přístupové soubory nikdy nenahrávejte na GitHub.
4. Po zeleném nasazení otevřete záložku **Manuály** a ověřte správný uzamčený i odemčený stav.
5. Ve Správě spusťte Kontrolu Studia.

## Lokální kontrola

```bash
npm run sync:offline
npm test
```

Autor a vývojový garant: Daniel Baláž  
Školní projekt Gymnázia, Ostrava-Hrabůvka
