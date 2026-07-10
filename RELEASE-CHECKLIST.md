# Release checklist AI Studio GHRAB 0.2.0

## Před vydáním

- [x] Verze v `package.json` je 0.2.0.
- [x] Registr obsahuje čtyři aktuální aplikace a je připraven na další.
- [x] Verze odpovídají dodaným balíčkům: Generátor 7.0.4, Diferenciátor 1.0.1, LUDUS 1.14.1, Korespondenční asistent 4.0.1.
- [x] Každý zdrojový repozitář vytváří veřejný `studio-manifest.json`.
- [x] Studio umí online synchronizaci i bezpečný fallback.
- [x] GitHub Actions podporují hodinovou i okamžitou aktualizaci.
- [x] Portál neobsahuje API klíč ani jiná tajemství.
- [x] Hlavní stránky mají českou a anglickou variantu.
- [x] PWA manifest, service worker a ikony jsou součástí buildu.
- [x] Knihovna obsahuje pouze fiktivní ukázková data.
- [x] Pilotní přehled ukládá jen místní počet spuštění.
- [x] `npm run sync:offline && npm test` prochází bez chyby.
- [x] Workflow soubory jsou syntakticky platné.

## Po nasazení

- [ ] Nahrát nejprve tři zdrojové repozitáře aplikací.
- [ ] V každém zdrojovém repozitáři zkontrolovat zelený deploy.
- [ ] Ověřit dostupnost všech čtyř souborů `studio-manifest.json`.
- [ ] Nahrát a nasadit repozitář `AI-Studio-GHRAB`.
- [ ] Ve Studiu otevřít stránku **Automatizace** a potvrdit 4/4 zdrojů online.
- [ ] Provést smoke test skutečných odkazů všech aplikací.
- [ ] Otestovat instalaci PWA na počítači a mobilní zobrazení.
- [ ] Volitelně nastavit `AI_STUDIO_DISPATCH_TOKEN` pro okamžitou synchronizaci.
