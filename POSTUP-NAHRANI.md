# Přesný postup nahrání AI Studio GHRAB 0.20.3 na GitHub

**Aktuální verze: 0.20.3**

## Doporučené pořadí

1. Nejprve nasaďte aktuální chráněné verze dílčích aplikací:
   - Generátor interaktivních testů 7.1.4,
   - Diferenciátor 1.3.3,
   - Hodnotitel maturitních slohů 1.5.2,
   - Korespondenční asistent 5.9.3,
   - LUDUS 1.16.3,
   - ACTIVA 0.5.0,
   - SORTIO 1.0.2,
   - Lesson Hub 1.2.0.
2. U Lesson Hubu nejprve ověřte živý manifest `/lesson-hub/studio-manifest.json` a interaktivní manuál `/lesson-hub/manual/`.
3. Potom nahrajte obsah balíku AI Studio GHRAB 0.20.3 do kořene repozitáře `AI-Studio-GHRAB`.
4. Zachovejte složky `.github`, `src`, `scripts` a soubory `package.json` a `package-lock.json`.
5. Složku `dist` nenahrávejte. GitHub Actions ji vytvoří znovu při každém nasazení.
6. Po commitu otevřete záložku **Actions** a ověřte zelený běh „Sync, certify and deploy AI Studio GHRAB“.
7. Po nasazení zavřete staré otevřené karty Studia a znovu je otevřete. Nový service worker už nepřebírá rozpracovanou relaci násilně.

## Co se děje automaticky

- manifesty aplikací se načtou ze zdrojových repozitářů,
- proběhnou bezpečnostní a regresní testy,
- vygeneruje se changelog, produkční `dist/`, PWA precache a `build-info.json`,
- výsledek se nasadí na GitHub Pages.

## Kontrola verze

V patičce Studia a v `dist/build-info.json` musí být verze **0.20.3**.

## Pořadí pro Core

1. Nejprve nasaďte KS 5.9.3 s `aiCore` manifestem a `ai-operations.json`.
2. Potom nasaďte AI Studio 0.20.3; jeho workflow načte živý manifest KS během synchronizace.
3. Ve Správě ověřte stav KS „Nasazeno“.
4. Teprve potom migrujte další aplikace pomocí Migration Kitu 1.0.2.
