# Release checklist AI Studio GHRAB 0.5.1

## Blokující kontrola před nahráním

- [x] Všechny čtyři zdrojové manifesty používají pilotní, nikoli školní produkční status.
- [x] Studio i buildy dílčích aplikací obsahují pojistku proti návratu statusu „produkční“.
- [x] Školní aplikace neobsahují v kořeni zastaralé sestavené složky.
- [x] Zápisy do `localStorage` jsou chráněny proti zaplnění a zablokování.
- [x] Pracovní tok má autosave, obnovu konceptu a varování při zavření.
- [x] Exportní sebetest používá skutečnou transformační funkci.
- [x] Report odděluje učitelem vykázaný čas od automatického odhadu.
- [x] PWA cache obsahuje sdílený modul bezpečného exportu.
- [x] Bezpečnostní dokumentace vysvětluje sdílený origin a profily prohlížeče.
- [x] Dokumentace je označena jako platná pro 0.5.1.

## Zdrojové aplikace

- [x] Generátor 7.0.5: bridge 1.1, validace materiálu, bezpečné zápisy, návratová URL, banner bez `innerHTML`.
- [x] Diferenciátor 1.0.2: bridge 1.1 a pilotní manifest.
- [x] Korespondenční asistent 4.0.2: bridge 1.1 a pilotní manifest.
- [x] LUDUS 1.14.2: validace handoffu, bezpečné zápisy a pilotní manifest.
- [x] Manifesty vyžadují Studio 0.5.1 a deklarují Studio Bridge 1.1.

## Testy

- [ ] `npm run sync:offline && npm test` ve Studiu.
- [ ] `npm test` v Generátoru.
- [ ] `npm run build && npm test` ve Školních aplikacích.
- [ ] `npm test` v LUDUSu.
- [ ] Ručně ověřit čtyři předávky na stejném originu.
- [ ] Ručně ověřit import `.ghrab.json` mezi různými originy.
- [ ] Ověřit Android Chrome a iPhone Safari na výšku i na šířku.

## Po nahrání

- [ ] Nejdříve nasadit tři repozitáře dílčích aplikací.
- [ ] U Školních aplikací jednorázově odstranit staré kořenové sestavené artefakty podle návodu.
- [ ] Poté nasadit Studio 0.5.1.
- [ ] Ověřit zelený běh GitHub Actions.
- [ ] Ve Studiu zkontrolovat `4/4` manifestů a režim synchronizace.
- [ ] Spustit **Kontrolu Studia**.
- [ ] Vyzkoušet anonymní JSON/CSV export a ruční předání správci.
- [ ] Po delší neaktivitě zkontrolovat, zda GitHub nevypnul plánované workflow.
