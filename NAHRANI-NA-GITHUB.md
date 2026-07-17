# Přesný postup nahrání AI Studio GHRAB 0.15.0 na GitHub

**Aktuální verze: 0.17.5**

## Doporučené pořadí

1. Nejprve nasaďte aktuální chráněné verze dílčích aplikací:
   - Generátor interaktivních testů 7.1.0,
   - Diferenciátor 1.2.0,
   - Hodnotitel maturitních slohů 1.4.0,
   - Korespondenční asistent 5.1.0,
   - LUDUS 1.15.0.
2. Potom nahrajte obsah balíku AI Studio GHRAB 0.15.0 do kořene repozitáře `AI-Studio-GHRAB`.
3. Zachovejte složky `.github`, `src`, `scripts` a soubory `package.json` a `package-lock.json`.
4. Složku `dist` nenahrávejte. GitHub Actions ji vytvoří znovu při každém nasazení.
5. Po commitu otevřete záložku **Actions** a ověřte zelený běh „Sync, validate and deploy AI Studio GHRAB“.
6. Po nasazení zavřete staré otevřené karty Studia a znovu je otevřete. Nový service worker už nepřebírá rozpracovanou relaci násilně.

## Co se děje automaticky

- manifesty aplikací se načtou ze zdrojových repozitářů,
- proběhnou bezpečnostní a regresní testy,
- vygeneruje se changelog, produkční `dist/`, PWA precache a `build-info.json`,
- výsledek se nasadí na GitHub Pages.

## Kontrola verze

V patičce Studia a v `dist/build-info.json` musí být verze **0.15.0**.
