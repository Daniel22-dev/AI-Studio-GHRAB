# Nahrání AI Studio GHRAB 0.6.1 na GitHub

## Pořadí

1. AI Studio GHRAB 0.6.1
2. Generátor testů 7.0.6
3. Školní aplikace — Diferenciátor 1.0.3 a Korespondenční asistent 4.0.3
4. LUDUS 1.14.3

Studio se nahrává první, protože ostatní aplikace při startu načítají jeho centrální modul `/AI-Studio-GHRAB/access/app-guard.js`.

## Postup v GitHub Desktopu

1. Rozbal veřejný ZIP Studia.
2. Otevři lokální repozitář přes **Show in Explorer**.
3. Smaž původní obsah kromě skryté složky `.git`.
4. Zkopíruj do kořene celý obsah rozbaleného ZIPu.
5. Commit: `AI Studio GHRAB v0.6.1`.
6. Klikni na **Push origin**.
7. Počkej na zelený běh v **Actions**.
8. Otevři Studio a použij `Ctrl + Shift + R`.

## Kontrola

- bez přístupu jsou karty uzamčené,
- administrátorský přístup odemkne všechny karty,
- stránka Můj přístup funguje,
- Správa je dostupná pouze správci,
- soukromý administrátorský ZIP není v repozitáři.

## Finální synchronizace verzí

Po nasazení všech dílčích aplikací otevřete repozitář AI Studia → **Actions** → **Sync, validate and deploy AI Studio GHRAB** → **Run workflow**. Studio si tak okamžitě načte nové manifesty. Bez ručního spuštění se synchronizace provede automaticky při dispatchi z aplikace, pokud je nastaven secret `AI_STUDIO_DISPATCH_TOKEN`, nebo nejpozději při hodinové plánované kontrole.
