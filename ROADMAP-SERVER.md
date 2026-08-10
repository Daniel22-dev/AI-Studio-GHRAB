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
- zálohy, obnova a auditní logy.

## Etapa C — plná platforma

- role učitel / komise / správce / vedení,
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
