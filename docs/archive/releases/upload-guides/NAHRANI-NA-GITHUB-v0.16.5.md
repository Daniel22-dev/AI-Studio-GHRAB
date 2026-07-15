# Nahrání AI Studio GHRAB v0.16.5 na GitHub

1. Rozbal balíček `AI-Studio-GHRAB-v0.16.5-GITHUB-READY.zip`.
2. Nahraj celý jeho obsah přímo do kořene repozitáře `AI-Studio-GHRAB`.
3. Zachovej skrytou složku `.github`, složky `src`, `scripts`, `docs` a soubory `package.json` a `package-lock.json`.
4. Složku `dist` není nutné nahrávat; GitHub Actions ji vytvoří automaticky.
5. Doporučený commit: `v0.16.5 – elegantní launch, instalace PWA a auditní opravy`.
6. V kartě Actions ověř zelené dokončení workflow.
7. Po nasazení zavři starou otevřenou kartu nebo PWA a spusť Studio znovu. Nový service worker nepřebírá rozpracovanou relaci násilně.

## Rychlá kontrola po nasazení

- domovská obrazovka je čistá a stabilní;
- po kliknutí na aplikaci se zobrazí klidná prémiová celoplošná animace;
- tlačítko Přeskočit animaci funguje;
- v podporovaném Chrome nebo Edge se při splnění podmínek zobrazí vpravo dole nabídka instalace;
- v nainstalované PWA se instalační nabídka již nezobrazuje;
- správa, evidence a formuláře nejsou zatíženy novými 3D efekty.
