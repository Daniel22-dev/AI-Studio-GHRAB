# Release checklist AI Studio GHRAB 0.21.11

> Aktuální verze: **0.21.11** · etapa P5

## Veřejný balík

- [x] Verze 0.21.11 je shodná v package, PWA manifestu, QA manifestu, buildu, dokumentaci a changelogu.
- [x] Všechny aplikace jsou ve výchozím stavu uzamčené.
- [x] Veřejný balík obsahuje pouze veřejný ověřovací klíč.
- [x] Ve zdroji ani buildu není soukromý klíč ani `.ghrab-access.json`.
- [x] Učitelské a správcovské rozhraní jsou oddělené.
- [x] Správcovské moduly se bez role admin nespouštějí.
- [x] Top 4 a sci-fi herní styl jsou zachovány.
- [x] Katalog změn je dostupný všem přihlášeným uživatelům jen v horní navigaci.
- [x] Materiály jsou v běžné navigaci jako server-ready katalog; centrální Tvorba materiálů v navigaci není. Bez serveru zůstává sdílení viditelně neaktivní.
- [x] Pilotní metriky jsou přesně označeny jako místní.
- [x] PWA cache se generuje automaticky z produkčního stromu a neobsahuje neplatné cesty.
- [x] Všechny lokální JS/CSS vstupy a relativní modulové importy mají ve výsledném buildu revizi `?v=0.21.11`.
- [x] Serverový katalog se aktivuje pouze při `school-server` + `schoolServerConnected` + `sharedMaterialLibrary`; GitHub profil nemůže omylem publikovat materiál.
- [x] Rychlá kontrola dat je rozbalovací pomocník pro nejisté situace, ne povinný krok před každým použitím AI.
- [x] Semafor má deset praktických kategorií, používá nejvyšší zvolené riziko a bezpečná anonymní volba je výlučná.
- [x] Kontrola zdrojů rozlišuje deploy / veřejný GitHub zdroj / snapshot a offline QA nepřepisuje poslední síťový stav.
- [x] Zástupce správce se při povýšení existujícího učitele automaticky nerozšiřuje na všechny aplikace.
- [x] Showcase video propouští Range požadavky mimo CacheStorage a fullscreen orbit je omezen i výškou viewportu.
- [x] AI Studio má samostatný manuál učitele a rozšířený manuál administrátora; admin verze má vlastní runtime kontrolu role.
- [x] Domovský odkaz „Poprvé v AI Studiu?“ je pouze drobný role-aware text pod stavem Studia, nikoli další panel.
- [x] Úvodní překryv má nezávislý fail-open watchdog a při selhání uvolní inertní stav rozhraní.
- [x] V mobilním Nastavení (do 650 px) je přepínač CZ/EN viditelný a kritický browser flow jej fyzicky přepne EN → CS.
- [x] `npm test` prochází bez chyby.
- [x] Statické `no-store` registry mají network-first cache fallback a runtime API/deployment zůstávají mimo service worker.
- [x] Offline-start Playwright test je součástí `qa:browser` a na GitHubu musí potvrdit 8 online + 8 offline karet.

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
- [ ] V anonymním okně potvrdit osm viditelných a uzamčených aplikací (čtyři v Top 4 a čtyři v katalogu).
- [ ] Načíst správcovské oprávnění.
- [ ] Spustit Kontrolu Studia.
- [ ] Ověřit Android Chrome, desktop Chrome/Edge a iPhone Safari.
- [ ] Ověřit přenos materiálu do všech podporovaných aplikací.

## Manuály

- [ ] Každý manifest obsahuje platné HTTPS `manualUrl`.
- [ ] Katalog zobrazuje všech osm karet i bez přístupu.
- [ ] Učitel otevře jen manuály povolených aplikací.
- [ ] Správce otevře všechny manuály.
- [ ] `manualy/index.html`, `manualy/manualy.js` a `manualy/manualy.css` jsou v PWA precache.

## GHRAB AI Core 1.0.0

- [x] Core manifest a SHA-256 jsou ověřovány buildem.
- [x] `.prettierignore` chrání celý `src/ai-core/releases/**` před změnou bajtové podoby.
- [x] Formátovací příkazy i GitHub Actions ověřují Core před formátováním a workflow také bezprostředně po něm.
- [x] Runtime povoluje pouze `direct-gemini` a zakazuje automatický fallback.
- [x] Migrační stav se odvozuje z živých manifestů; lokální certifikace se nezobrazuje jako nasazená.
- [x] Regresní test akceptuje pravdivý přechodový stav i živý stav `ready` a kontroluje konzistenci souhrnných počtů.
- [x] Migration Kit 1.0.3 obsahuje kontrakt, neměnný Core, konformitní sadu, opravený integrační prompt a bezpečný consumer workflow.

## Jednotný reportér chyb

- [x] Centrální základ a synchronizované lokální kopie jsou shodné.
- [x] Samostatné aplikace používají `errorReporter: false` a vytvářejí právě jednu lokální instanci.
- [x] Service worker cachuje JS a CSS reportéru.
- [x] Automatická sada ověřuje motivy, koncept, pět screenshotů, Gmail odkaz, novou kartu, ZIP, soukromí a iframe AI Studia.
- [ ] Ručně ověřit skutečný systémový picker sdílení obrazovky a lištu Chromu.
- [ ] Ručně ověřit přihlášený Gmail a přiložení ZIPu.
