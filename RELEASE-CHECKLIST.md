# Release checklist AI Studio GHRAB 0.16.5

## Veřejný balík

- [x] Verze 0.16.5 je shodná v package, buildu, dokumentaci a changelogu; PWA manifest nepoužívá nestandardní pole `version`.
- [x] Všechny aplikace jsou ve výchozím stavu uzamčené.
- [x] Veřejný balík obsahuje pouze veřejný ověřovací klíč.
- [x] Ve zdroji ani buildu není soukromý klíč ani `.ghrab-access.json`.
- [x] Učitelské a správcovské rozhraní jsou oddělené.
- [x] Správcovské moduly se bez role admin nespouštějí.
- [x] Top 4 a sci-fi herní styl jsou zachovány.
- [x] Komunikace je oddělena od výukového workflow.
- [x] Import materiálů má hloubkovou validaci a limity.
- [x] Pilotní metriky jsou přesně označeny jako místní.
- [x] PWA cache se generuje automaticky z produkčního stromu a neobsahuje neplatné cesty.
- [x] `npm test` prochází bez chyby.

## Soukromý administrátorský balík

- [x] Obsahuje soukromý klíč.
- [x] Obsahuje platné správcovské oprávnění.
- [x] Obsahuje bezpečnostní návod.
- [ ] Uložit do bezpečné soukromé zálohy.
- [ ] Nikdy nenahrát na GitHub ani nesdílet s kolegy.

## Dílčí aplikace

- [ ] Vložit správný `*-access-bootstrap.example.js` do každého repozitáře.
- [ ] Upravit poslední dynamický import podle skutečného vstupního modulu.
- [ ] Ověřit přímou URL bez oprávnění.
- [ ] Ověřit oprávnění pro jinou aplikaci.
- [ ] Ověřit správné učitelské oprávnění.
- [ ] Ověřit správcovské oprávnění.

## Po nasazení

- [ ] Ověřit zelený GitHub Actions build.
- [ ] V anonymním okně potvrdit pět viditelných a uzamčených aplikací (čtyři v Top 4 a jednu v katalogu).
- [ ] Načíst správcovské oprávnění.
- [ ] Spustit Kontrolu Studia.
- [ ] Ověřit Android Chrome, desktop Chrome/Edge a iPhone Safari.
- [ ] Ověřit přenos materiálu do všech podporovaných aplikací.

## Manuály

- [ ] Každý manifest obsahuje platné HTTPS `manualUrl`.
- [ ] Katalog zobrazuje všech pět karet i bez přístupu.
- [ ] Učitel otevře jen manuály povolených aplikací.
- [ ] Správce otevře všechny manuály.
- [ ] `manualy/index.html`, `manualy/manualy.js` a `manualy/manualy.css` jsou v PWA precache.
