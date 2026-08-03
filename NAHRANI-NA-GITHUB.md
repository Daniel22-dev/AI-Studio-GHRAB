# Nahrání AI Studio GHRAB 0.20.5

Tento balík zachovává samostatné repozitáře aplikací a přidává definitivní opravu otevírání předvyplněného Gmailu v centrálním reportéru.

> Verze 0.20.5 nahrazuje skriptované otevírání okna skutečným odkazem prohlížeče. Tím odstraňuje blokování Gmailu v PWA, vloženém rámci i chráněném kontextu. Současně odstraňuje nespolehlivou volbu přímého sdílení ZIPu.

## Postup

1. Nejprve nasaďte Korespondenčního asistenta 5.9.9 do jeho repozitáře.
2. Otevřete repozitář `Daniel22-dev/AI-Studio-GHRAB`.
3. Nahrajte **obsah ZIPu přímo do kořene repozitáře** a potvrďte přepsání existujících souborů.
4. Zachovejte zejména složky `.github`, `src`, `scripts`, `qa` a soubory `package.json` a `package-lock.json`.
5. Složku `dist` nahrávat nemusíte; GitHub Actions ji sestaví znovu.
6. Po commitu se workflow spustí automaticky. Sledujte, zda projdou `qa-build`, `qa-diagnostics` a `deploy`.
7. Po zeleném nasazení zavřete staré karty i nainstalovanou PWA, poté AI Studio spusťte znovu.

## Očekávaný výsledek

Kliknutí na **Stáhnout balíček a otevřít e-mail** otevře v nové kartě předvyplněný Gmail na adrese `balaz@ghrabuvka.cz`. Na původní kartě se současně připraví a stáhne diagnostický ZIP.

Pokud Gmail uživatel nepoužívá, reportér nabízí samostatný odkaz pro poštovní aplikaci a možnost zkopírovat údaje zprávy.
