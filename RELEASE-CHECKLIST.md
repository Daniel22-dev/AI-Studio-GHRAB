# Release checklist AI Studio GHRAB 0.21.59

> Aktuální verze: **0.21.59** · etapa P5

> 0.21.59 přidává řízené auto-patch promotion release wave pro GARP 2.5.1 zařazené aplikace; default zůstává manual a pouze živý deployment může být auto-promoted.

## Stav bezpečnostního kandidáta GARP 2.3

- [x] Claude na 0.21.38 nezávisle potvrdil C-01, C-02 a C-03, včetně přirozeného Browser Back na localhostu.
- [x] D-01 / HIGH z kontroly 0.21.38 byl proti kódu potvrzen: `deleteMyData()` odstraňoval generační značku, ale po destruktivním smazání ji znovu nerotoval.
- [x] 0.21.43 rotuje generační značku po `deleteMyData()` i shared-device `endWork()` a fail-closed odmítne plný úspěch při selhání zápisu tombstone.
- [x] GARP regrese obsahují samostatný případ `delete-rotates-generation`; sabotážní negative control bez rotace jej prokazatelně vyvolá do FAIL.
- [x] SIM-03 browser harness testuje obě destruktivní cesty, následné psaní a novou kartu a zapisuje evidence mimo veřejný `dist/`.
- [x] Nový nezávislý auditní cyklus byl uživatelem výslovně zahájen.
- [ ] 0.21.43 musí projít druhým nezávislým Claude ověřením tohoto nového cyklu, protože obsahuje distribuovanou opravu D-01.
- [ ] RT-16 account-side (MFA, branch protection, secret scanning, key custody) zůstává bez úplného důkazu.
- [ ] Do uzavření všech gate kandidát není schválen pro reálná studentská data.

## Veřejný balík

- [x] Verze 0.21.59 je shodná v package, PWA manifestu, QA manifestu, buildu, dokumentaci a changelogu.
- [x] Všechny aplikace jsou ve výchozím stavu uzamčené.
- [x] Veřejný balík obsahuje pouze veřejný ověřovací klíč.
- [x] Centrum zabezpečení je dostupné jen plnému správci; zástupce může v evidenci pouze připravit JTI.
- [x] Konfigurační klíč se neukládá do webového úložiště a po podpisu, opuštění stránky nebo deseti minutách se vymaže.
- [x] Veřejný aktualizační balíček zachovává politiku a permitový klíč, je podepsaný ES256 a neobsahuje soukromý materiál.
- [x] Aktualizační balíček prošel 23/23 validačními kontrolami a navazuje na bundle z verze 0.21.32.
- [x] Nasazený bundle obsahuje právě JTI starého učitelského oprávnění; `revokedBefore` zůstává prázdné a nové oprávnění správce zástupce není dotčeno.
- [x] Samostatný regresní test ověřuje podpis, přesné JTI a shodu `sharedAccessVersion` v obou aktivních deployment profilech.
- [x] `access:validate-update` před začleněním odmítne neplatný podpis, cizí trust anchor, rollback revokací nebo soukromý materiál.
- [x] Klíč pro uživatelská oprávnění zůstává beze změny, takže dosud platná oprávnění nejsou rotací konfigurace zneplatněna.
- [x] Ve zdroji ani buildu není soukromý klíč ani `.ghrab-access.json`.
- [x] Učitelské a správcovské rozhraní jsou oddělené.
- [x] Správcovské moduly se bez role admin nespouštějí.
- [x] Top 4 a sci-fi herní styl jsou zachovány.
- [x] Katalog změn je dostupný všem přihlášeným uživatelům jen v horní navigaci.
- [x] Materiály jsou v běžné navigaci jako server-ready katalog; centrální Tvorba materiálů v navigaci není. Bez serveru zůstává sdílení viditelně neaktivní.
- [x] Pilotní metriky jsou přesně označeny jako místní.
- [x] PWA cache se generuje automaticky z produkčního stromu a neobsahuje neplatné cesty.
- [x] Každá změna runtime UI musí zvýšit verzi aplikace; stejná verze nesmí být znovu použita pro změněné JS/CSS, protože PWA cache je verzovaná číslem aplikace.
- [x] Všechny lokální JS/CSS vstupy a relativní modulové importy mají ve výsledném buildu revizi `?v=0.21.59`.
- [x] Odkazy přístupové brány při vložení do iframe opustí rámec a otevřou AI Studio v hlavním okně.
- [x] Viewer obsahuje pojistku proti vnořenému AI Studiu a styly brány odolávají obecnému CSS vložených aplikací.
- [x] Serverový katalog se aktivuje pouze při `school-server` + `schoolServerConnected` + `sharedMaterialLibrary`; GitHub profil nemůže omylem publikovat materiál.
- [x] Rychlá kontrola dat je rozbalovací pomocník pro nejisté situace, ne povinný krok před každým použitím AI.
- [x] Semafor má deset praktických kategorií, používá nejvyšší zvolené riziko a bezpečná anonymní volba je výlučná.
- [x] Kontrola zdrojů rozlišuje deploy / veřejný GitHub zdroj / snapshot a offline QA nepřepisuje poslední síťový stav.
- [x] Zástupce správce se při povýšení existujícího učitele automaticky nerozšiřuje na všechny aplikace.
- [x] Showcase video propouští Range požadavky mimo CacheStorage a fullscreen orbit je omezen i výškou viewportu.
- [x] Showcase video nemá vadný černý snímek v prologu; zvuková stopa má souvislou časovou osu, 48 kHz stereo AAC-LC a webový fast-start export.
- [x] Reportér po povolení snímání nečeká bez omezení na `loadedmetadata`, má časově omezené čekání na skutečný frame a viditelně potvrzuje uložení screenshotu.
- [x] Produkční CSP povoluje `blob:` v `img-src`, takže náhled zachyceného screenshotu není zablokovaný po převodu z canvasu.
- [x] Produkční regresní test před reálným MediaStreamem vrací kartu AI Studia do popředí a ověřuje její viditelnost, aby Chromium throttling pozadí nevytvářel falešný CSP pád.
- [x] Regrese reportéru pokrývá pořízení snímku v dialogu i z plovoucího panelu, opožděné zpřístupnění video rozměrů a skutečný canvas MediaStream na produkčním indexu AI Studia.
- [x] AI Studio má samostatný manuál učitele a rozšířený manuál administrátora; admin verze má vlastní runtime kontrolu role.
- [x] Domovský odkaz „Poprvé v AI Studiu?“ je pouze drobný role-aware text pod stavem Studia, nikoli další panel.
- [x] Úvodní překryv má nezávislý fail-open watchdog a při selhání uvolní inertní stav rozhraní.
- [x] V mobilním Nastavení (do 650 px) je přepínač CZ/EN viditelný a kritický browser flow jej fyzicky přepne EN → CS.
- [x] `npm test` prochází bez chyby.
- [x] Statické `no-store` registry mají network-first cache fallback a runtime API/deployment zůstávají mimo service worker.
- [x] Podepsaný access bundle a jeho podpis jsou mimo service worker; 24hodinový offline limit se počítá od posledního online načtení a podepsaný bundle má samostatný 30denní limit.
- [x] `bundle.version` odpovídá zapečenému `sharedAccessVersion` a release brána kontroluje podpis, stáří i shodu verze podle skutečného času.
- [x] GitHub i school-server build mají zapečený deployment profil; neznámý profil je uzamčený a nesmaže osobní klíč jen kvůli chybě načtení konfigurace.
- [x] XSS sink baseline je nula a nový `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` nebo `new Function` zastaví release.
- [x] Všechny použité GitHub Actions jsou připnuté na plný commit SHA.
- [x] `npm run test:security-regressions` behaviorálně ověřuje SW bypass, oba časové limity, odolnost proti podvrženému času a fail-closed školní profil bez lokálních API klíčů.
- [x] Behaviorální test Centra zabezpečení ověřuje platný podpis, sjednocení revokací, obnovu bundle, odmítnutí cizího klíče a neměnnost vstupu.
- [x] Offline-start Playwright test je součástí `qa:browser` a na GitHubu musí potvrdit 8 online + 8 offline karet.

## Soukromý administrátorský balík

- [x] Obsahuje soukromý klíč.
- [x] Obsahuje platné správcovské oprávnění.
- [x] Obsahuje bezpečnostní návod.
- [ ] Uložit do bezpečné soukromé zálohy.
- [ ] Nikdy nenahrát na GitHub ani nesdílet s kolegy.

## Dílčí aplikace

- [x] `release-promotion-policy.json` má `defaultMode: manual`, `atomic: true` a auto-patch nepovoluje aplikaci bez explicitního GARP 2.5.1 enrollmentu.
- [x] Verified ecosystem gate povoluje auto-patch pouze z `verification: deployment`; repository fallback ani snapshot nesmí patch povýšit.
- [x] Syntetická regrese potvrzuje PASS pro `5.10.25 → 5.10.26` a BLOCK pro minor, rollback, source drift, repository drift, Platform drift a neověřený AI operations manifest.
- [x] `release-wave.json` se při QA nemutuje a audit rozhodnutí vzniká pouze v gitignorovaném `qa-results/release-promotion-report.json`.


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
