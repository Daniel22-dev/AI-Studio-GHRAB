# AI Studio GHRAB 0.7.0 — komentář změn

## Co bylo přidáno

Do hlavní navigace byla přidána učitelská záložka **Manuály**. Obsahuje pět karet, tedy jednu pro každou aktuálně připojenou aplikaci.

## Jak fungují oprávnění

Karty vidí každý uživatel AI Studia. Tlačítko pro otevření je aktivní pouze tehdy, když `hasAppAccess(appId)` vrátí platný přístup. Role `admin` automaticky odemyká všechny průvodce. Manuály jsou současně chráněny i ve vlastních repozitářích aplikací, takže přímá adresa nepředstavuje obcházení brány.

## Jak se manuály aktualizují

AI Studio nekopíruje HTML manuálů. Používá pole `manualUrl` ze stejného manifestu, ze kterého načítá název, popis a verzi aplikace. Nová verze aplikace proto publikuje současně novou verzi manuálu.

## Oddělení od stávajících nápověd

Interaktivní manuál je celková prohlídka produktu. Nenahrazuje malé otazníky, bezpečnostní pravidla, onboarding ani krátké kontextové rady uvnitř jednotlivých aplikací.
