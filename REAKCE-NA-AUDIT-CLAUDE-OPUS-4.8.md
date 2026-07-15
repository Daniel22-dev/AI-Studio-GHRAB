# Posouzení auditu Claude Opus 4.8 a provedené opravy

**Auditovaná verze:** AI Studio GHRAB 0.14.4  
**Opravená verze:** AI Studio GHRAB 0.15.0  
**Datum posouzení:** 15. 7. 2026

## Celkový verdikt

Audit je technicky velmi kvalitní a ve většině konkrétních nálezů přesný. Jeho hlavní teze — že největším rizikem projektu už není základní kvalita kódu, ale ruční udržování týchž údajů na více místech — je správná.

Z třinácti negativních bodů:

- u deseti souhlasím bez podstatné výhrady,
- u tří souhlasím jen částečně nebo doplňuji důležitý kontext,
- žádný zásadní nález není vyloženě nepravdivý.

Některé formulace auditu jsou záměrně ostré. Například tříletá platnost oprávnění nebo množství dokumentů v kořeni nejsou samy o sobě bezpečnostní incidenty. Jsou však oprávněně označeny jako procesní a provozní dluh, který by se při dlouhodobém provozu mohl změnit v reálný problém.

## Posouzení pozitivních částí

Pozitivní hodnocení kryptografie, ochrany soukromého klíče, CSP, obrany proti XSS, bezpečného zacházení s úložištěm, přístupnosti, animací a dosavadních regresních testů odpovídá zdrojům. Audit správně rozlišuje mezi tím, co je v projektu provedeno nadstandardně, a tím, co bez serveru z principu nelze garantovat.

Zvlášť správná jsou tato ocenění:

- použití Web Crypto a pevně určeného algoritmu ECDSA P-256/SHA-256,
- neexportovatelný ověřovací a podpisový klíč,
- striktní CSP bez `unsafe-inline` a `unsafe-eval`,
- ukládání uživatelských hodnot přes bezpečné DOM operace,
- otevřené přiznání limitů serverless ochrany,
- testy zaměřené na konkrétní dříve nalezené regresní chyby.

## Posouzení jednotlivých negativních nálezů

### 1. Školení bylo deklarované, ale nevynucené

**Verdikt: souhlasím. Závažný a přesný nález.**

Oprávnění sice obsahovalo objekt `training`, ale `hasAppAccess()` kontrolovalo pouze seznam aplikací. Změna požadované verze školení proto neměla žádný technický účinek.

**Opraveno v 0.15.0:**

- kontroluje se přítomnost školení pro konkrétní aplikaci,
- kontroluje se kód i přesná verze školení,
- chybějící školení vrací stav `training-missing`,
- zastaralá verze vrací stav `training-outdated`,
- učitelský wildcard přístup nově obsahuje školení pro všechny aktuální aplikace,
- správce zůstává záměrně vyňat, protože jeho role je administrátorská.

### 2. Duplicitní pravda a ruční synchronizace

**Verdikt: souhlasím. Toto je nejdůležitější procesní nález auditu.**

#### `apps.json`

Soubor neměl žádného spotřebitele a obsahoval staré údaje. Byl odstraněn. Test nyní zároveň hledá konfigurační JSON soubory, na které neodkazuje žádný spotřebitel.

#### `permissions.json` a `access-policy.json`

Metadata školení byla duplicitní. Sekce `apps` byla z `permissions.json` odstraněna a jediným zdrojem aplikační a školicí politiky je `access-policy.json`.

#### Dva changelogy

`CHANGELOG.md` se nyní generuje z `src/config/changelog.json`. Ruční rozjezd pořadí a chybějících verzí už není možný, protože test porovnává přesné pořadí verzí v obou souborech.

#### Ruční seznam PWA cache

`CORE` seznam service workeru se nyní vytváří při buildu z výsledného stromu `dist/`. Test kontroluje, že každý produkční soubor je v precache a každá položka skutečně existuje.

#### `src/` a `dist/`

`dist/` je přidán do `.gitignore` a není součástí distribučního GitHub balíku. GitHub Actions jej vždy vytvoří znovu. Tím se odstraňuje ručně udržovaná druhá kopie aplikace.

### 3. Zastaralé verze dokumentace

**Verdikt: souhlasím.**

Aktivní dokumentace byla aktualizována na 0.15.0. Regresní test nyní vyžaduje aktuální verzi v úvodu těchto dokumentů:

- `README.md`,
- `BEZPECNOST.md`,
- `AUTOMATIZACE-GITHUB.md`,
- `RELEASE-CHECKLIST.md`,
- `ARCHITEKTURA.md`,
- oba aktuální návody k nahrání.

Historické release dokumenty si ponechávají historická čísla, ale byly přesunuty do archivu a nejsou vydávány za aktuální dokumentaci.

### 4. Ručně minifikované zdroje

**Verdikt: souhlasím.**

Výkonový přínos zde nebyl, protože build soubory neminifikoval. Nevýhody pro diff, ladění a revizi byly reálné.

**Opraveno v 0.15.0:**

- celý aktivní zdrojový strom byl přeformátován pomocí Prettieru,
- přidán `.editorconfig`,
- `npm test` nyní spouští `prettier --check`,
- GitHub Actions instaluje přesné závislosti přes `npm ci`.

### 5. Nadbytek markdownů v kořeni

**Verdikt: souhlasím s problémem, nikoli s nutností vše mazat.**

Historické dokumenty mohou mít hodnotu při dohledávání vývoje. Nemají ale být v kořeni vedle aktuální dokumentace.

**Opraveno:**

- `KOMENTAR-ZMEN-*` přesunuty do `docs/archive/releases/change-notes/`,
- `QA_REPORT_*` přesunuty do `docs/archive/releases/qa/`,
- verzované návody k nahrání přesunuty do `docs/archive/releases/upload-guides/`,
- test zakazuje návrat těchto vzorů do kořene.

Velký obrázek designového konceptu není součástí produkčního `dist/`; jde tedy o velikost repozitáře, nikoli zátěž PWA. Jeho další komprese je možná, ale není funkční ani bezpečnostní prioritou.

### 6. Rotace klíče bez překryvu

**Verdikt: souhlasím.**

Původní konfigurace uměla pouze jeden `kid`. Výměna klíče by zneplatnila všechna starší oprávnění současně.

**Opraveno v 0.15.0:**

- konfigurace obsahuje pole `keys` a `activeKeyId`,
- ověřování vybírá klíč podle `kid` oprávnění,
- starý a nový veřejný klíč mohou být po přechodnou dobu publikovány současně,
- kvůli bezpečné migraci zůstala zachována také původní pole `keyId` a `publicKey`, aby starší klient neodmítl konfiguraci okamžitě po nasazení.

Jde o záměrnou přechodnou kompatibilitu. Až budou staré klientské cache bezpečně mimo provoz, lze schéma povýšit bez kompatibilních polí.

### 7. Maximální platnost 1095 dní

**Verdikt: souhlasím s rizikem.**

Tři roky jsou pro přenositelný soubor uložený v prohlížeči zbytečně dlouhé.

**Opraveno:**

- nová oprávnění mají maximální platnost 400 dní,
- vydavatel delší platnost nevytvoří,
- stará oprávnění vydaná před přechodem mají migrační limit 1095 dní, aby aktualizace neočekávaně neuzamkla správce nebo učitele,
- po 15. 7. 2026 se na nově vydané přístupy uplatňuje pouze limit 400 dní.

Toto je bezpečnější než okamžité globální zneplatnění všech případných starších dlouhých oprávnění.

### 8. Soukromý klíč zůstával v paměti

**Verdikt: částečně souhlasím.**

Zbytečně dlouhé ponechání klíče v otevřené kartě je reálné riziko. Okamžité smazání po každém podpisu by ale výrazně zhoršilo běžné hromadné vydávání přístupů více kolegům.

**Zvolené řešení:**

- ruční tlačítko pro okamžité vymazání klíče,
- automatické vymazání po 10 minutách nečinnosti,
- odstranění reference při zavření nebo opuštění stránky,
- timer se po úspěšném podpisu obnoví.

Tím je riziko omezeno bez zbytečného opakovaného načítání klíče po každém učiteli.

### 9. Hodinový cron

**Verdikt: souhlasím.**

Hodinová pojistka byla nadbytečná vedle `repository_dispatch` a mohla rušit právě probíhající nasazení.

**Opraveno:**

- pojistná synchronizace běží jednou denně ve 3:17 UTC,
- `cancel-in-progress` je nastaveno na `false`,
- okamžité aktualizace nadále řeší `repository_dispatch`.

### 10. Service worker: network-first a okamžité převzetí

**Verdikt: souhlasím s hlavní výtkou.**

Network-first pro každý statický soubor znehodnocoval výhodu PWA na pomalé síti. `skipWaiting()` a `clients.claim()` mohly vytvořit směs starého JavaScriptu a nových assetů v otevřené kartě.

**Opraveno:**

- statické soubory používají cache-first,
- konfigurační JSON a `build-info.json` používají network-first,
- odstraněny `skipWaiting()` a `clients.claim()`,
- nový service worker převezme aplikaci až po bezpečném ukončení staré relace,
- standardní návod už nevyžaduje rutinní `Ctrl + F5`.

### 11. PWA manifest

**Verdikt: souhlasím.**

**Opraveno:**

- přidáno stabilní `id: /AI-Studio-GHRAB/`,
- odstraněno nestandardní pole `version`,
- odstraněna osiřelá ikona `icon-180.png`.

Verze aplikace zůstává v `package.json`, changelogu, patičce a `build-info.json`, tedy na místech, která ji skutečně používají.

### 12. Ručně napsaný synchronizační report

**Verdikt: souhlasím.**

Commitnutý soubor nesměl předstírat, že proběhlo síťové ověření, když neproběhlo.

**Opraveno:**

- výchozí zdrojový report má režim `unverified`, `generated: false`, `generatedAt: null` a stavy zdrojů `null`,
- obsahuje jasnou poznámku, že jde o stav po rozbalení zdrojů,
- `npm run sync` vytváří skutečný report s `generated: true` a reálným časem,
- GitHub Actions spouští synchronizaci před testem a nasazením.

### 13. `app-guard` jako praktická, nikoli serverová ochrana

**Verdikt: audit má pravdu, ale slučuje dva odlišné problémy.**

#### Nedostupnost centrálního modulu

To je opravitelná provozní chyba. Integrační bootstrapy v AI Studiu nyní načítají guard dynamicky uvnitř `try/catch` a při selhání zobrazí srozumitelnou chybovou obrazovku místo bílé stránky.

**Důležité:** skutečné bootstrapy v pěti samostatných repozitářích je nutné nahradit těmito novými šablonami při jejich příští aktualizaci. Tento balík AI Studia nemůže sám změnit cizí repozitáře.

#### Obejití přes veřejný statický kód

To není opravitelná chyba čistě statického GitHub Pages řešení. Motivovaný technický uživatel může veřejný kód stáhnout nebo spustit jiným vstupním bodem. Skutečné vynucení vyžaduje serverové API, školní identitu a autorizaci na straně serveru.

Dokumentace byla zpřesněna, aby ochranu nepřeprodávala. Bootstrap je nyní výslovně popsán jako praktická ochrana proti běžnému sdílení přímé adresy, nikoli jako ochrana zdrojového kódu před technicky zkušeným útočníkem.

## Nové procesní pojistky

Verze 0.15.0 nepřepisuje pouze jednotlivé hodnoty. Přidává pravidla, která mají zabránit návratu stejné třídy chyb:

- formátování je vynuceno v testu,
- aktivní dokumentace musí uvádět aktuální verzi,
- changelog se generuje z jediného JSON zdroje,
- duplicitní aplikační politika je testem zakázána,
- mrtvé konfigurační JSON soubory jsou detekovány,
- PWA precache se generuje a porovnává s výsledným buildem,
- historické release soubory se nesmějí vrátit do kořene,
- workflow musí používat denní cron, `npm ci` a nesmí rušit rozpracovaný deploy,
- test výslovně kontroluje vynucení školení, sadu veřejných klíčů a životní cyklus soukromého klíče.

## Co zůstává mimo tento balík

1. Nasazení robustního bootstrapu do pěti samostatných aplikací.
2. Budoucí serverové přihlášení, databáze a skutečná autorizace na straně API.
3. Případná další komprese archivního designového obrázku.

## Závěr

Claude Opus 4.8 projekt neposoudil nespravedlivě. Audit je přísný, ale jeho hlavní technické a procesní závěry jsou správné. Největší přínos není v jednotlivých opravách, nýbrž v tom, že verze 0.15.0 převádí opakovaně zapomínaná pravidla do automaticky vynucovaných testů a generátorů.
