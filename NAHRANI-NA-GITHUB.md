# Nahrání opravy AI Studio GHRAB 0.18.5

Tento balík opravuje selhání `qa-build` po přechodu SORTIO z verze 1.0.1 na 1.0.2.

## Postup

1. Otevřete repozitář `Daniel22-dev/AI-Studio-GHRAB`.
2. Nahrajte **obsah ZIPu přímo do kořene repozitáře** a potvrďte přepsání existujících souborů.
3. Zachovejte zejména složky `.github`, `src`, `scripts`, `qa` a soubory `package.json` a `package-lock.json`.
4. Složku `dist` nahrávat nemusíte; GitHub Actions ji sestaví znovu.
5. Po commitu se workflow spustí automaticky. Sledujte, zda projdou `qa-build`, `qa-diagnostics` a `deploy`.
6. Po zeleném nasazení zavřete všechny staré karty AI Studia a otevřete Studio znovu.

## Očekávaný výsledek

Ve správě zdrojů bude SORTIO zobrazeno jako **Ověřeno, verze 1.0.2** a nebude použit záložní registr.
