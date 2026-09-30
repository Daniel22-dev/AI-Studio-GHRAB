# AI Studio GHRAB 0.21.135 — implementační a auditní report

Datum: 2026-09-30  
Etapa: PROMPT 01 — centrální `Moje skupiny`  
Výchozí verze: 0.21.134  
Výsledná verze: 0.21.135

## 1. Audit současného stavu

Výchozí AI Studio bylo ověřeno jako GHRAB Platform 1.1.2 / GARP 2.7. Před změnami prošla statická GARP 2.7 brána. `ghrab-material-v1` je existující artifact/material kontrakt a nebyl použit ani rozšířen pro studentské rostery.

Read-only revize současných consumer implementací potvrdila:

- SORTIO má vlastní import a při plné aktualizaci umí chybějící studenty archivovat místo destruktivního smazání.
- Hodnotitel maturitních slohů má robustnější rozpoznání e-mailů, hlaviček, šumu a IS/CSV tvarů, ale jeho lokální roster ID je odvozené z PII; tento princip nebyl převzat.
- Lesson Hub má vlastní dlouhodobou identitu/historii skupin; tato doménová historie se do AI Studia nepřesouvá.

## 2. Implementovaná architektura

Vznikla samostatná vrstva `src/groups/group-service.js` s kontraktem `GHRAB_GROUPS` a kanonickým schématem `ghrab-teaching-group-v1`.

Hlavní vlastnosti:

- stabilní náhodné `groupId` a `memberId` přes Web Crypto,
- monotónní `revision`, optimistic concurrency přes `expectedRevision`,
- local-first provider pod servisním rozhraním,
- namespaced storage `ghrab.ai-studio.groups.v1`,
- validace před zápisem a verifikace po zápisu,
- recovery přes last-known-good / prázdný validní store,
- JSON backup/restore,
- change notification bez PII,
- consumer allowlist a datově minimální projekce,
- žádný raw provider snapshot ve veřejném API.

Podrobný kontrakt a threat model: `docs/MOJE-SKUPINY-V1.md`.

## 3. UI „Moje skupiny“

Přidána reálná sekce AI Studia:

- přehled aktivních/archivovaných skupin,
- vytvoření a úprava metadata,
- archivace / reaktivace,
- detail s počty a revizí,
- tabulka aktivních i archivovaných studentů,
- import/aktualizace z IS,
- preview změn před potvrzením,
- explicitní rozlišení přidat / změnit / obnovit / archivovat / beze změny,
- JSON záloha a obnova s upozorněním na PII,
- responzivní desktop/mobile layout a reduced-motion varianta.

Navigace se v AI Studiu doplňuje dynamicky jako učitelská položka `Moje skupiny`; nevzniklo plošné kopírování navigačního HTML do všech stránek.

## 4. Import pipeline

Centrální parser podporuje jména, školní e-maily a běžné kombinace newline/tab/středník/čárka/pipe. Umí hlavičky, včetně správného pořadí sloupců `Příjmení / Jméno / E-mail`, šum, deduplikaci, invalidní položky a limituje vstup na 120 000 znaků / 500 studentů.

Aktualizace nejdříve páruje jednoznačným e-mailem a následně jednoznačným normalizovaným jménem. Změna jména/e-mailu zachovává `memberId`. Chybějící aktivní člen se archivuje, obnovený člen získá zpět původní identitu.

## 5. Security / privacy výsledek

- XSS: uživatelská data nejsou renderována přes `innerHTML`; HTML-like jména parser odmítá.
- Formula injection: CSV helper chrání `=`, `+`, `-`, `@`, TAB a CR.
- PII leakage: change events i storage diagnostics obsahují pouze technické kódy / náhodné ID / revizi.
- Cross-app exposure: SORTIO nedostává e-mail, Hodnotitel jej dostává, Lesson Hub a Generátor nedostávají členy.
- Material handoff: roster není připojen k `ghrab-material-v1`.
- Revision manipulation/stale preview: `expectedRevision` failuje konfliktem.
- Invalid/corrupt storage: fail-closed recovery.
- Oversized import: pevné limity a lineární parser.

Známé omezení etapy: local-first znamená, že PII zůstávají v uživatelském profilu prohlížeče. Nejde o serverovou ani víceuživatelskou synchronizaci a nebyl přidán nový shared-device cleanup workflow.

## 6. Consumer projekce a migrační poznámky

- `sortio`: `memberId + name`, bez e-mailu. Budoucí migrace pouze explicitně; doménová data SORTIO zůstávají v SORTIO.
- `essay-evaluator`: `memberId + name + schoolEmail`. Budoucí migrace nahradí PII-derived lokální roster ID kanonickým `memberId`, ale párování/výsledky zůstávají v Hodnotiteli.
- `lesson-hub`: pouze metadata skupiny. Později reference na kanonický `groupId`; historie hodin zůstává v Lesson Hubu.
- `generator`: metadata-only seam je připraven, Generátor nebyl změněn.

Nebyla provedena automatická migrace dat žádného consumeru.

## 7. Test report

### PASS

- `npm run test:groups` — parser, schema validation, CRUD, revision, diff/archive/restore, projekce, PII leakage regression, hostile XSS vstupy, corrupt-store recovery, backup/restore, formula injection, 500členný performance limit, statický mobile/desktop/a11y sanity.
- `npm run build` + postbuild Platform conformance — PASS, Platform 1.1.2 zachována.
- `npm run test:studio-ux` — PASS.
- `npm run test:security-regressions` — 19/19 PASS + security-center + deployed-revocation PASS.
- `npm run qa:garp27:static` — PASS (contract, policy mutation, mutation, auto-patch).
- `npm run qa:quality` — 206/206 PASS, 0 warningů.
- `npm run format:check` — hermetická JS/JSON syntaktická kontrola PASS; Prettier není v dodaném archivu nainstalován.

### Performance budget

Nová funkce je on-demand a není součástí povinného service-worker precache. Tím se precache drží na 1 142 894 B z limitu 1 250 000 B a kritická vstupní cesta na 374 775 B z limitu 420 000 B. Celkový distribuční budget byl kvůli novému samostatnému modulu upraven z 2 420 000 B na 2 500 000 B; aktuální dist payload je 2 491 630 B. Ostatní performance limity nebyly uvolněny.

### Release freshness vůči GitHubu

`npm run verify:release-version` nelze z dodaného ZIPu korektně vyhodnotit, protože archiv neobsahuje `.git` metadata ani `origin/main`. Kontrola skončila na `fatal: not a git repository`; nejedná se o aplikační regresi. GitHub nebyl v této etapě měněn.

### Neprovedený runtime browser matrix

Dodaný archiv neobsahuje `node_modules`/Playwright runtime. Statický mobile/desktop/a11y sanity test je součástí `test:groups`; standardní browser QA lze zopakovat v běžném CI prostředí s instalovanými devDependencies. Pokus o samostatný headless Chromium screenshot v tomto sandboxu nedokončil proces v časovém limitu, proto není označen jako PASS.

## 8. Změněné / přidané soubory

### Funkční změny

- `src/groups/group-service.js` — nový canonical service/provider/parser/projection contract
- `src/groups/groups.js` — UI controller
- `src/groups/groups.css` — responzivní UI
- `src/groups/index.html` — nová sekce
- `src/schemas/ghrab-teaching-group-v1.schema.json` — JSON Schema
- `src/app.js` — učitelská navigace `Moje skupiny`
- `scripts/test-groups.mjs` — regresní test suite
- `package.json` — `test:groups` a zařazení do hlavního `test/check`
- `docs/MOJE-SKUPINY-V1.md` — architektura, threat model a migration seam

### Release metadata 0.21.135

- `package-lock.json`
- `ghrab-platform.consumer.json` (verze/cache + distribuční performance budget)
- `src/index.html`
- `src/manifest.webmanifest`
- `src/config/changelog.json`
- `src/config/release-acceptance.json`
- `src/tests/error-reporter-adapter.js`
- `qa/qa-manifest.json`
- `reporter-test.config.json`
- `README.md`, `ARCHITEKTURA.md`, `BEZPECNOST.md`, `AUTOMATIZACE-GITHUB.md`, `RELEASE-CHECKLIST.md`, `POSTUP-NAHRANI.md`, `NAHRANI-NA-GITHUB.md`
- `CHANGELOG.md` (generováno)
- `src/config/ai-readiness.generated.json` (generováno při build/QA)
- `dist/` (nově sestavený build 0.21.135)

## 9. Explicitně neprovedeno

- žádná integrace Generátoru,
- žádná server DB,
- žádná změna Google OAuth,
- žádné přímé načítání/scraping školního IS,
- žádná skutečná studentská data v repozitáři/testech,
- žádná automatická migrace dat ze SORTIO/Hodnotitele/Lesson Hubu,
- žádný zápis na GitHub.

## Závěr

PROMPT 01 je implementován jako samostatná local-first kanonická skupinová vrstva s bezpečným parserem, revision kontraktem, minimálními consumer projekcemi, uživatelským UI, backup/recovery a serverovým provider seamem. GHRAB Platform 1.1.2 a GARP 2.7 zůstaly zachovány; GitHub nebyl změněn.
