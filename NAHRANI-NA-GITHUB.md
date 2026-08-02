# Nahrání AI Studio GHRAB 0.19.0

Tento balík zachovává samostatné repozitáře aplikací a aktualizuje registry AI Studia na Korespondenčního asistenta 5.5.5.

## Postup

1. Otevřete repozitář `Daniel22-dev/AI-Studio-GHRAB`.
2. Nahrajte **obsah ZIPu přímo do kořene repozitáře** a potvrďte přepsání existujících souborů.
3. Zachovejte zejména složky `.github`, `src`, `scripts`, `qa` a soubory `package.json` a `package-lock.json`.
4. Složku `dist` nahrávat nemusíte; GitHub Actions ji sestaví znovu.
5. Po commitu se workflow spustí automaticky. Sledujte, zda projdou `qa-build`, `qa-diagnostics` a `deploy`.
6. Po zeleném nasazení zavřete všechny staré karty AI Studia a otevřete Studio znovu.

## Očekávaný výsledek

Karta Korespondenčního asistenta bude zobrazovat verzi 5.5.5 a centrum manuálů bude odkazovat na aktuální manuál z jeho samostatného repozitáře.
