# Architektura AI Studio GHRAB 0.21.57

> Aktuální verze: **0.21.57** · etapa P5

> 0.21.57 odděluje ručně schválený release-wave baseline od bezpečně odvozeného auto-patch promotion pro GARP 2.5.1 zařazené aplikace.

## Koherence aktualizace PWA

Produkční build přidává `?v=<verze>` ke všem lokálním JS/CSS vstupům a k relativním modulovým importům. Aktivní service worker obslouží z vlastní cache jen asset požadovaný pro svou verzi; při požadavku na jinou verzi jde přímo na síť. Tím se při čekající aktualizaci nesmí spojit nové HTML se starým JavaScriptem. Úvodní překryv má navíc samostatný fail-open watchdog, takže chyba hlavního modulu nesmí ponechat zbytek rozhraní inertní.

## Federovaný portál

Generátor, Diferenciátor, Hodnotitel maturitních slohů, LUDUS, Korespondenční asistent, ACTIVA, SORTIO a Lesson Hub zůstávají v samostatných repozitářích. Každá aplikace zveřejňuje manifest; Studio sestaví společný registr a při nedostupnosti živého zdroje použije ověřený fallback.

```text
samostatné aplikace ─ manifesty ─► AI Studio
                                   ├─ Top 4 a katalog
                                   ├─ učitelské rozhraní
                                   ├─ správcovské rozhraní
                                   ├─ volitelný materiálový handoff (podporované aplikace)
                                   ├─ bezpečnost a diagnostika
                                   └─ pilot a report
```


## Release-wave a přechod na GARP 2.5.1

`release-wave.json` zůstává explicitní baseline lock. Nová policy vrstva `release-promotion-policy.json` dovoluje pouze vybraným GARP 2.5.1 aplikacím odvodit bezpečné patch promotion z živě ověřeného deploymentu. Nejde o mutaci wave během QA: verified gate pouze rozhodne `CURRENT / ELIGIBLE / BLOCKED` a výsledek uloží jako auditní evidence.

Tím se odděluje **detekce verze** od **promotion politiky**. Synchronizace může znát novou verzi každé aplikace, ale automaticky je přijat pouze vyšší patch u předem zařazeného GARP pipeline. Minor/major změna nebo změna integračních invariantů zůstává člověkem řízenou změnou wave.

## Server-ready katalog materiálů

Záložka **Materiály** má dva pravdivě oddělené režimy:

- **GitHub/serverless profil:** ukázkové balíčky, místní import a místní pracovní prostor. Nic se nesdílí mezi kolegy.
- **School-server profil:** po skutečném připojení serveru se aktivuje repository adapter pro komise, serverové verze a quality events.

Klientská vrstva `src/library/material-service.js` se nesmí aktivovat jen podle existence UI. Vyžaduje `profile=school-server`, `features.schoolServerConnected=true` a `features.sharedMaterialLibrary=true`. Kontrakt počítá s načtením komisí, publikací anonymizovaného materiálu, vytvořením vlastní kopie a serverově autorizovanými událostmi `classroom-tested` a `commission-reviewed`. Materiál s `provenance.containsPersonalData=true` klient k publikaci odmítne.

```text
aplikace -> GHRAB Material v1 -> Moje materiály
                              -> Komise (server) -> verze / vlastní kopie
                                                -> Ověřeno ve výuce
                                                -> Doporučeno komisí
```

Studio tedy není devátý editor. Materiál vzniká v konkrétní aplikaci; Studio je katalog, úložiště, místo sdílení a předávací bod.

## Role rozhraní

**Učitel:** Aplikace, Materiály, Manuály, Bezpečnost, Můj přístup a Katalog změn.
**Zástupce správce (`operator`):** navíc Pohled kolegy, Správa, Diagnostika, Pilot, souhrnný Report a Evidence přístupů; nemá Vydavatele oprávnění, Prezentaci ani správu podpisových klíčů.
**Správce (`admin`):** plná sada provozních a bezpečnostních nástrojů včetně Vydavatele oprávnění a Prezentace.

Správcovské stránky jsou po načtení konfigurace nahrazeny přístupovou bránou, pokud prohlížeč nemá platné správcovské oprávnění. Jejich vlastní moduly se bez správce nespustí.

## Podepsaná oprávnění

Formát `ghrab-access-permit-v1` obsahuje zejména:

- vydavatele a publikum,
- držitele a zobrazované jméno,
- roli,
- seznam aplikací nebo `*`,
- absolvovaná školení a jejich verze,
- datum vydání, počátek a konec platnosti,
- unikátní `jti`,
- identifikátor podpisového klíče.

Podpis používá ECDSA P-256 / SHA-256. Veřejná část klíče je v `access-public-key.json`; soukromá část nesmí vstoupit do zdrojového ani distribučního balíku.

## Ochrana samostatné aplikace

`access/app-guard.js` ověří stejné oprávnění i v cílové aplikaci. Doporučený bootstrap nejprve zavolá `protectApp(appId)` a původní aplikační modul dynamicky importuje pouze při úspěchu. Tím se nezobrazí ani nespustí vlastní aplikace bez oprávnění.

## Top 4 a katalog

Kolem jádra jsou nejvýše čtyři uživatelské priority. Ve výchozím pořadí jsou Generátor, Diferenciátor, Hodnotitel a Korespondenční asistent; LUDUS zůstává v katalogu. Při růstu katalogu lze další aplikace připnout; přebytečné se přesunou do navazujícího katalogu. Top 4 je záměrně zachováno již nyní.

## Materiály a handoff

- `ghrab-material-v1` — přenositelný výukový materiál,
- `ghrab-handoff-v1` — krátkodobá předávka s expirací 30 minut,
- `ludus-content-v2` — obsah pro LUDUS.

Přímý handoff používá `localStorage` a vyžaduje stejný origin. Mezi rozdílnými originy zůstává náhradní cestou `.ghrab.json`. Import prochází limity velikosti, struktury, délek, počtu úloh a povinných polí.

## Místní datové vrstvy

- `ghrab.access.permit.v2` — podepsané oprávnění,
- `ghrab.workspace.v1` — místní materiály,
- `ghrab.workflow.draft.v1` — automatický koncept,
- `ghrab.handoff.v1` — krátkodobá předávka,
- `ghrab.pilot.launches` — spuštění ze Studia v daném prohlížeči,
- `ghrab.pilot.events.v2` — anonymní provozní události,
- `ghrab.report.cases.v1` — anonymní případové studie.

## Přechod na server

Server nahradí import oprávnění školním přihlášením, místní úložiště databází, handoff API a místní reporty centrálními anonymními agregacemi. Uživatelské rozhraní a identifikátory aplikací mohou zůstat zachovány.

## Interaktivní manuály

- AI Studio obsahuje pouze katalog `manualy/`; vlastní manuál zůstává v repozitáři konkrétní aplikace. Po nasazení nové verze aplikace se proto v AI Studiu zobrazí její aktuální manuál bez ručního kopírování, pokud zůstane zachována stejná `manualUrl`.
- Adresa manuálu je povinné pole `manualUrl` v `ai-studio-app-manifest-v1`.
- Katalog vždy zobrazí všech osm aplikací a pro otevření použije `hasAppAccess(appId)`.
- Správce díky roli `admin` otevře všechny manuály; učitel jen manuály aplikací uvedených v podepsaném oprávnění.
- Samotný manuál je navíc chráněn stejným `app-guard.js`, takže přímá URL neobchází AI Studio.

## Centrální AI vrstva

AI Studio neprovádí modelová volání. Vydává neměnný GHRAB AI Core, runtime konfiguraci a readiness report. Aplikace zveřejňují `aiCore` ve Studio manifestu a `ai-operations.json`; server-ready stav je uznán až z živě načtených metadat.


## Provozní zastupitelnost

Role `operator` je určena pro dlouhodobější nepřítomnost hlavního správce. Její oprávnění jsou záměrně menší než `admin`; plné pravomoci lze předat pouze samostatným správcovským permitem s krátkou expirací. Vydavatel 0.21.33 nabízí rychlé doby 7, 14 a 30 dní. Role ve Studiu a přístup ke zdrojovému kódu jsou oddělené: běžný zástupce GitHub přístup nepotřebuje. Pokud má zároveň technicky zastupovat vývoj/deploy, používá vlastní GitHub účet s nejmenší potřebnou rolí pro vybrané repozitáře; přihlašovací údaje hlavního správce se nikdy nesdílejí.

## Živá přítomnost

Od 0.21.53 je v centrálním `access/platform-runtime.js` připraven klientský heartbeat pro budoucí školní server. Protože chráněné aplikace načítají centrální `app-guard` Studia, není pro samotný heartbeat nutné duplikovat stejnou implementaci do každého aplikačního repozitáře. Heartbeat se aktivuje pouze při skutečném serverovém profilu s `livePresence=true`; serverless profil neprovádí síťový request. Správcovský seznam používá `modules/live-presence.js` a serverový kontrakt `docs/LIVE-PRESENCE-SERVER-CONTRACT.md`.

## API spotřeba a náklady

Od 0.21.54 je připraven klientský adaptér `modules/api-usage.js` a full-admin stránka `api-usage/`. Klient nikdy nečte OpenAI administrátorský klíč přímo; po skutečném připojení školního serveru načítá pouze agregovaný kontrakt `admin/api-usage`. Stejný adaptér používá měsíční report, takže finanční údaje mají jeden serverový zdroj pravdy. Přesný kontrakt je v `docs/API-USAGE-SERVER-CONTRACT.md`.
