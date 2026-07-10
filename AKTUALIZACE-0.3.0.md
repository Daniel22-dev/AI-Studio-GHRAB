# Aktualizace AI Studio GHRAB na 0.3.0

Verze 0.3.0 vychází přímo z uživatelem preferované verze 0.2.1. Zachovává její automatický, plný, úsporný a vypnutý režim animací, optimalizaci pro mobilní zařízení i tlačítko celé obrazovky. Varianta 0.2.2 s výhradně ručním řízením animací nebyla použita.

## Co je součástí vydání

Pro plnou funkčnost propojeného pracovního toku nahraj čtyři balíčky:

1. Generátor testů 7.0.5,
2. Diferenciátor 1.0.2 a Korespondenční asistent 4.0.2,
3. LUDUS 1.14.2,
4. AI Studio GHRAB 0.3.0.

Samotné Studio bude fungovat i bez aktualizace aplikací, ale přímé převzetí materiálu cílovou aplikací vyžaduje nové balíčky se Studio Bridge v1. Záložní stažení `.ghrab.json` zůstává vždy dostupné.

## Doporučený postup

1. Rozbal ZIP Generátoru a nahraj jeho obsah do kořene repozitáře `generator-testu`.
2. Rozbal ZIP školních aplikací a nahraj jeho obsah do kořene repozitáře `Skolni-aplikace`.
3. Rozbal ZIP LUDUSu a nahraj jeho obsah do kořene repozitáře `Ludus`.
4. U každého repozitáře počkej na zelený běh v `Actions`.
5. Rozbal ZIP Studia a nahraj jeho obsah do kořene repozitáře `AI-Studio-GHRAB`.
6. Počkej na zelený běh v `Actions`.
7. Na počítači proveď `Ctrl + F5`; na telefonu stránku zavři a znovu otevři.

## Očekávané verze ve Studiu

- Generátor interaktivních testů 7.0.5,
- Diferenciátor 1.0.2,
- LUDUS 1.14.2,
- Korespondenční asistent 4.0.2.

## Co zůstává beze změny

- všechny aplikace zůstávají v samostatných repozitářích,
- jejich dosavadní odkazy zůstávají stejné,
- AI Studio je samostatný centrální portál,
- automatická synchronizace verzí přes `studio-manifest.json` zůstává zachována,
- bez serveru se neukládají školní účty, společná databáze ani centrální API klíč.
