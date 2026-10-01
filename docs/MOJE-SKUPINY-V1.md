# Moje skupiny v1 — architektura

## Účel

`Moje skupiny` je centrální kanonická evidence identity vyučovací skupiny a jejího členství. Neabsorbuje doménovou logiku SORTIO, Hodnotitele maturitních slohů ani Lesson Hubu. Aktuální etapa je local-first; serverová databáze, OAuth změny a přímé napojení na školní IS nejsou součástí implementace.

## Kanonický kontrakt

- schema: `ghrab-teaching-group-v1`
- náhodné stabilní `groupId` (`grp_*`), nikdy neodvozené ze jména/e-mailu
- monotónní `revision`
- `displayName`, `schoolYear`, volitelný `subject`, `grade`
- stav `active | archived`
- timestamps
- `members[]` s náhodným stabilním `memberId` (`mem_*`), `name`, volitelným `schoolEmail`, stavem a timestamps

JSON Schema je v `src/schemas/ghrab-teaching-group-v1.schema.json`.

## Service/provider hranice

Veřejný kontrakt `GHRAB_GROUPS` poskytuje CRUD, import rosteru, revize, bezpečné projekce, metadata-only seznam skupin pro autorizované consumery, subscription a backup/restore. UI nečte raw storage klíč. Lokální provider používá `ghrab.ai-studio.groups.v1`, validuje celý store před zápisem a zápis po uložení znovu ověřuje. Poškozená data se nepředávají dál; provider použije poslední známou validní kopii v paměti nebo prázdný validní store.

Serverová migrace má proběhnout vytvořením provideru se stejnou servisní hranicí. UI a consumer projection contract se tím nemají měnit.

## Import z IS

Parser sjednocuje užitečné principy existujících implementací SORTIO a Hodnotitele:

- jméno + e-mail, pouze e-mail i pouze jméno,
- newline, tab, středník, čárka a pipe v běžných IS/CSV tvarech,
- ignorování hlaviček a typického šumu; hlavičky `Příjmení / Jméno / E-mail` určují správné pořadí jména,
- deduplikace,
- samostatný seznam invalidních položek,
- preview před zápisem,
- bezpečnostní limity 120 000 znaků a 500 členů skupiny.

Při aktualizaci se člen nejprve páruje jednoznačným e-mailem, poté jednoznačným normalizovaným jménem. Shoda zachovává `memberId`. Chybějící aktivní člen se při plném importu archivuje; znovu nalezený archivovaný člen se obnoví se stejným `memberId`.

## Revision/sync kontrakt

Každá skutečná změna metadata nebo rosteru zvyšuje `revision` právě o 1. No-op změna revizi nezvyšuje. Preview vrací `currentRevision`; potvrzení může předat `expectedRevision`. Pokud mezitím dojde ke změně, import skončí `GROUP_REVISION_CONFLICT` a uživatel musí vytvořit nový preview.

Change notification obsahuje pouze typ změny, náhodné `groupId` a revizi — nikdy jméno ani e-mail.

## Projekce pro aplikace

| Consumer ID | Projekce |
|---|---|
| `sortio` | metadata + `memberId`, `name`, `status` pro aktivní i archivované členy; bez e-mailu |
| `essay-evaluator` | metadata + aktivní `memberId`, `name`, `schoolEmail` |
| `lesson-hub` | pouze metadata skupiny |
| `generator` | pouze metadata; připravený budoucí seam, bez integrace |

Neznámý consumer je odmítnut. `ghrab-material-v1` ani Studio handoff se pro roster nepoužívají.

Pro výběr skupiny používá consumer `listGroupMetadata(consumerAppId)`. Tato metoda vrací pouze metadata skupiny (`groupId`, `revision`, zobrazovaný název, školní rok, předmět/ročník, stav, čas změny) a nikdy členy ani e-maily. Plný roster se načítá až explicitně přes `getRosterProjection(groupId, consumerAppId)`.

## Threat model a mitigace

| Riziko | Mitigace |
|---|---|
| XSS z vloženého seznamu | HTML-like jména jsou odmítnuta; UI vkládá uživatelské hodnoty přes `textContent`, nikoli `innerHTML`. |
| CSV formula injection | `csvSafeCell()` prefixuje nebezpečné počátky `= + - @ TAB CR`. |
| PII v telemetrii/logu | Service nemá telemetry/reporter transport; diagnostika nese pouze generické kódy. |
| PII v material handoffu | Skupinová služba je od `ghrab-material-v1` oddělena. |
| Stale roster | `revision` + `expectedRevision` optimistic concurrency. |
| Cross-app overexposure | allowlist projekcí podle `consumerAppId`; neznámý consumer fail-closed. |
| ID collision / PII-derived ID | Web Crypto UUID/random; ID se neodvozuje z jména ani e-mailu. |
| Manipulace s revizí/schématem | validace celého kanonického store před zápisem i po zápisu. |
| Oversized import / DoS | 120 kB text, max. 500 členů; parser je lineární. |
| Poškozený localStorage | validace + last-known-good fallback / prázdný validní store. |
| Sdílený počítač | Local-first data jsou PII a zůstávají v profilu prohlížeče. Tato etapa nepřidává automatický shared-device cleanup; serverová etapa má storage nahradit providerem s řízenou identitou. |

## Migrace consumerů — budoucí etapy

### SORTIO

Nahradit vlastní výběr/roster kanonickým výběrem `groupId`. SORTIO má požadovat pouze `sortio` projekci. Jeho vlastní prezence, losování, historie a další doménová data zůstávají uvnitř SORTIO. Staré rostery se nesmějí automaticky sloučit bez preview/mappingu.

### Hodnotitel maturitních slohů

Použít `essay-evaluator` projekci a nahradit stávající PII-derived roster ID kanonickým `memberId`. Párování prací, výsledky a delivery workflow zůstávají v Hodnotiteli. Migrace starého rosteru musí mít explicitní kontrolu učitelem.

### Lesson Hub

Lesson Hub má ke své dlouhodobé výukové historii přidat referenci na kanonické `groupId`; jeho lekce, plány a kontinuita zůstávají v Lesson Hubu. V první integraci stačí metadata projekce bez členů.

### Generátor interaktivních testů

V této etapě se nemění. Consumer ID `generator` je rezervován pouze jako metadata-only seam pro pozdější integraci.
