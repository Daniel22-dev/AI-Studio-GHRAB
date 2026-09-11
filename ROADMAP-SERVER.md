# Přechod AI Studio GHRAB na školní server

## Etapa A — řízený bezserverový provoz

- GitHub Pages a samostatné repozitáře,
- podepsaná oprávnění vydávaná správcem,
- zámek ve Studiu a integrační zámek v každé aplikaci,
- místní pracovní prostor a automatický koncept,
- ruční anonymní export pilotních dat,
- handoff na stejném originu a `.ghrab.json` mezi originy,
- vlastní API klíče podle pravidel dílčích aplikací.

## Etapa B — školní server

- školní subdoména a HTTPS,
- přihlášení Google Workspace nebo Microsoft 365 účtem,
- role a školení uložené centrálně,
- oprávnění kontrolovaná v portálu, aplikaci i API bráně,
- osobní pracovní prostor v databázi,
- serverový katalog materiálů s osobním a komisním rozsahem,
- jednorázové handoff API,
- bezpečné serverové uložení API klíčů,
- anonymní agregované statistiky,
- krátkodobá živá přítomnost pro správce (kdo je online + právě používaná aplikace, bez historie),
- zálohy, obnova a auditní logy.

## Etapa C — plná platforma

- role učitel / komise / zástupce správce / správce / vedení,
- schvalování a verzování materiálů, včetně stavů Ověřeno ve výuce a Doporučeno komisí,
- centrální katalog komisí a osobní Top 4,
- rozpočtové limity a monitoring spotřeby,
- testovací a produkční prostředí,
- řízené aktualizace a rollback,
- dokumentované incidenty a odpovědnosti.

## Převod prvků

| Bez serveru                | Školní server                          |
| -------------------------- | -------------------------------------- |
| podepsaný soubor           | školní identita a serverové claims     |
| veřejný revokační JSON     | okamžitá správa účtů a oprávnění       |
| místní workspace           | osobní databázový prostor              |
| lokální handoff            | jednorázové API                        |
| ruční anonymní export      | centrální anonymní agregace            |
| soukromý vydavatelský klíč | správa identit a serverových tajemství |

## Otázky pro IT

1. Jaké přihlášení škola podporuje?
2. Kdo spravuje role a evidenci školení?
3. Jaký backend, databázi a zálohování lze dlouhodobě provozovat?
4. Kde budou API klíče a serverová tajemství?
5. Jak se oddělí testovací a produkční prostředí?
6. Kdo nasazuje aktualizace a řeší incidenty?
7. Jak bude nastavena doba uchování a anonymizace statistik?
8. Kdo vlastní doménu, GitHub organizaci a provozní účty?

## Sdílení materiálů mezi předmětovými komisemi

Tato oblast je od klienta 0.21.1 připravena jako samostatný serverový kontrakt, ale v GitHub Pages profilu zůstává neaktivní.

Po připojení školního serveru má fungovat tento tok:

1. Učitel vytvoří výstup v konkrétní aplikaci a uloží jej jako GHRAB Material v1.
2. V AI Studiu zvolí komisi, do které má podle školní identity oprávnění materiál publikovat.
3. Server uloží novou verzi a zachová autora, historii a auditní stopu; kolegové neupravují originál, ale vytvářejí vlastní kopie.
4. Po skutečném použití ve výuce může oprávněný učitel přidat stav **Ověřeno ve výuce**. Katalog eviduje počet potvrzených použití.
5. Oprávněná role komise může materiál označit **Doporučeno komisí**. Tento stav nikdy nepřiděluje klient ani AI automaticky.
6. Materiál lze následně předat do podporované aplikace jednorázovým serverovým handoffem.

Minimální bezpečnostní podmínky: školní session, kontrola členství v komisi, Origin/CSRF ochrana, audit změn, verzování, zálohy a zákaz publikace materiálu označeného jako obsahující osobní údaje. U sdílených výukových materiálů je anonymizace podmínkou, nikoli volitelným doporučením.


## Zastupitelnost správce po přechodu na server

Server má zachovat samostatnou provozní roli **Zástupce správce**. Ta smí kontrolovat stav ekosystému, diagnostiku, auditované provozní reporty a evidenci přístupů, ale nesmí měnit kořenové podpisové klíče, serverová tajemství ani udělovat plnou roli správce. Nouzové plné povýšení má být časově omezené, auditované, s automatickou expirací a jasným záznamem kdo, komu a do kdy práva předal.

## Živá přítomnost uživatelů

Klientský heartbeat je připraven od 0.21.52; od 0.21.53 je správcovský přehled přesunut přímo do horní lišty Studia vedle Nastavení. Bez serveru zůstává funkce vypnutá. Po aktivaci školního serveru mohou všechny chráněné aplikace přes společný `platform-runtime` posílat pouze krátký heartbeat s `appId`; jméno se odvodí ze serverové session. Správce pak přímo v horní liště Studia vedle Nastavení rozbalí seznam právě online uživatelů a jejich naposledy aktivní aplikaci. Přítomnost má být ephemeral stav s doporučeným TTL 120 sekund, bez historie přechodů, bez promptů, materiálů a studentských dat. Přesný API kontrakt je v `docs/LIVE-PRESENCE-SERVER-CONTRACT.md`.


## API spotřeba a finanční reporting

Od AI Studia 0.21.54 je klientská část připravená. Školní backend má implementovat `GET /api/v1/admin/api-usage`, držet OpenAI administrátorský klíč pouze jako serverový secret a vracet agregované náklady, rozpočet, tokeny a požadavky za zvolené období. Po aktivaci se data zobrazí ve Správě a automaticky na druhé straně měsíčního PDF reportu. Viz `docs/API-USAGE-SERVER-CONTRACT.md`.
