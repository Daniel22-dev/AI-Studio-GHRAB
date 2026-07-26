# Nahrání AI Studio GHRAB 0.18.6

Tento balík přepojuje Diferenciátor a Korespondenčního asistenta na jejich nové samostatné repozitáře a GitHub Pages adresy.

## Postup

1. Otevřete repozitář `Daniel22-dev/AI-Studio-GHRAB`.
2. Nahrajte **obsah ZIPu přímo do kořene repozitáře** a potvrďte přepsání existujících souborů.
3. Zachovejte zejména složky `.github`, `src`, `scripts`, `qa` a soubory `package.json` a `package-lock.json`.
4. Složku `dist` nahrávat nemusíte; GitHub Actions ji sestaví znovu.
5. Po commitu se workflow spustí automaticky. Sledujte, zda projdou `qa-build`, `qa-diagnostics` a `deploy`.
6. Po zeleném nasazení zavřete všechny staré karty AI Studia a otevřete Studio znovu.

## Očekávaný výsledek

Ve správě zdrojů budou Diferenciátor **1.3.3** a Korespondenční asistent **5.2.5** zobrazeny jako živě ověřené zdroje z vlastních repozitářů.
