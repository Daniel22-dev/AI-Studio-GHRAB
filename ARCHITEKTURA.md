# Architektura AI Studio GHRAB 0.15.0

**Aktuální verze: 0.17.0**

## Federovaný portál

Generátor, Diferenciátor, Hodnotitel maturitních slohů, LUDUS a Korespondenční asistent zůstávají v samostatných repozitářích. Každá aplikace zveřejňuje manifest; Studio sestaví společný registr a při nedostupnosti živého zdroje použije ověřený fallback.

```text
samostatné aplikace ─ manifesty ─► AI Studio
                                   ├─ Top 4 a katalog
                                   ├─ učitelské rozhraní
                                   ├─ správcovské rozhraní
                                   ├─ materiály a handoff
                                   ├─ bezpečnost a diagnostika
                                   └─ pilot a report
```

## Role rozhraní

**Učitel:** Aplikace, Tvorba materiálů, Materiály, Bezpečnost, Můj přístup.  
**Správce:** navíc Správa, Pilot, Report, Prezentace, Změny, Diagnostika a Vydavatel oprávnění.

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

- AI Studio obsahuje pouze katalog `manualy/`; vlastní manuál zůstává v repozitáři konkrétní aplikace.
- Adresa manuálu je povinné pole `manualUrl` v `ai-studio-app-manifest-v1`.
- Katalog vždy zobrazí všech pět aplikací a pro otevření použije `hasAppAccess(appId)`.
- Správce díky roli `admin` otevře všechny manuály; učitel jen manuály aplikací uvedených v podepsaném oprávnění.
- Samotný manuál je navíc chráněn stejným `app-guard.js`, takže přímá URL neobchází AI Studio.
