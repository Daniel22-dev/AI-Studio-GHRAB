# AI Studio GHRAB — standard uživatelských manuálů v1

**Status:** návrh Etapy B, 2026-10-08. **Není certifikací existujících manuálů.**

## 1. Účel a hranice

- **Manuály** ve Studiu = samostatná, kdykoli dostupná nápověda kolegům. Vždy existuje cesta od prvního spuštění k dokončení skutečného úkolu.
- **AI Akademie** = prezentace školitele s oddělenou projekcí, konzolí školitele a poznámkami. Výstupní účastnický handout odkazuje na odpovídající manuál; nepřepisujeme obsah manuálu do prezentací.
- **Centrální AI Studio** = společný první přístup, oprávnění, bezpečnostní zásady, obecné AI připojení a katalog.
- **Manuál aplikace** = skutečné ovládání a nastavení specifické pro daný nástroj. Například Google Forms, Apps Script, Sheets, Verifier a Recovery kód patří do GIT, nikoli do obecného manuálu Studia.
- **Administrátorská dokumentace** je oddělená od běžného učitele. Školitel může mít vlastní pracovní opory v Akademii.

## 2. Vstupní obrazovka každého manuálu

Uživatel se bez technického žargonu rozhodne maximálně ve třech krocích:

1. **Používám aplikaci poprvé** – jen nutné jednorázové nastavení.
2. **Chci právě udělat…** – konkrétní pracovní úkol, zvolený podle výsledku, nikoli technického modulu.
3. **Něco nefunguje** – příčina, bezpečné ověření a jeden následující krok.

Viditelně sdělíme, které položky jsou **jen jednou**, **při každém použití** a **volitelné**. Běžný učitel není nucen otevřít pokročilé technické sekce.

## 3. Formát jednoho kroku

Každý krok má: *co udělat* → *kam kliknout* → *co ověřit* → *co dál*. Přesné názvy tlačítek vycházejí z aktuálního UI. Každý zásadní externí přechod vyžaduje potvrzený výsledek, nejen otevření URL.

Příklad GIT:

- „Ve Verifieru klikněte **▶ Zahájit příjem**.“
- „Ve školním Forms **stiskněte Odeslat**.“
- „Teprve po odeslání START dejte studentům startovací kód.“

Při rizikových operacích je blízko odpovídající krok bezpečnostní upozornění, nikoli obecná vzdálená kapitola.

## 4. UX / premium standard

- Konzistentní školní identita, kvalitní typografie, kontrast a jednotné významy ovládacích prvků.
- Tři hlavní cesty: první nastavení, běžný úkol, řešení problémů.
- Krátké formulace v češtině s přesnými názvy položek. Srozumitelnost má přednost před terminologií.
- Responsivní rozlišení minimálně 390×844 (telefon), 768×1024 (tablet), 1366×768 (notebook), 1920×1080 (projektor). Bez horizontálního posuvu textu a zakryté navigace.
- Dotykové ovládání bez nutnosti hoveru. Aktivní fokus, sémantická navigace a klávesnice; rozbalovací prvky použitelné Enter/Space.
- Kontrolní seznamy nesmějí automaticky tvrdit, že uživatel něco dokončil; stav jen na základě jeho akce. Na sdíleném zařízení nesmí přetrvávat citlivá data.
- Navigace po obsahu, návrat do Studia, možnost otevřít související manuál.
- Každý návod uvede omezení současného serverless režimu bez falešných příslibů budoucích funkcí.
- Funkčnost na promítání je vlastností AI Akademie; manuál nepotřebuje přednáškový režim, má být rychle prohledatelný.

## 5. Pravdivá aktuálnost

**Aplikační release verze není doklad věcné aktuálnosti manuálu.** Je zakázáno vydávat „sync 9/9 aplikací“ za „manuály prověřeny 9/9“.

Povinná dokumentační metadata (návrh kontraktu):

- `appId`
- `appVersion` — verze aplikace, ke které je návod určen
- `docRevision` — vlastní revize obsahu manuálu
- `lastReviewedAt` — datum poslední věcné revize
- `reviewedBy` — odpovědná role / garant
- `reviewStatus`: `verified`, `review-required`, `unknown`
- `workflowChecks` — seznam konkrétních praktických cest, které byly ověřeny

Automatické CI může prokazovat pouze integritu metadat, odkazy, základní UI kontrakty a absenci zjevných drif­tů. Věcnou správnost skutečné práce potvrdí lidská revize a E2E test.

## 6. PDF export – požadovaný kontrakt (zatím neimplementováno)

Každý oprávněný uživatel získá v manuálu i v centrálním prohlížeči jednu akci **Stáhnout PDF**. Tlačítko skutečně stáhne PDF, neotevírá pouze tiskový dialog.

- PDF a interaktivní HTML musí vycházet ze stejného udržovaného obsahového zdroje.
- PDF obsahuje úplné znění všech postupů i skrytých rozbalovacích sekcí, obsah, verzování, datum věcné revize, číslování stran, čitelnou diakritiku, funkční odkazy a tisknutelnou A4.
- PDF nesmí obsahovat přístupové tokeny, API klíče, autentizovaný roster, studentské výsledky ani interní učitelská tajemství.
- Katalog zobrazí dostupnost PDF skutečně podle manifestu/artefaktu. Neexistuje-li PDF, tlačítko **nesmí předstírat funkci**.
- Ochrana přístupu nesmí být obcházena veřejnou adresou ke statickému PDF, pokud je dokumentace určena jen oprávněným uživatelům. Návrh distribuce musí zohlednit současný režim bez školního serveru.
- Exportní PDF a interaktivní manuál musí být věcně shodné; release gate kontroluje oba artefakty.

## 7. Verifikační matice před schválením

1. **Zdroj / statika** – dokumentační metadata, chybějící kotvy, odkazy, žádné duplikované ID, žádné tajné údaje.
2. **Uživatelský scénář** – nová učitelka provede úkol bez autora aplikace; žádné přeskočené kritické kroky.
3. **Role** – učitel, správce, uzamčený přístup, chybně platné oprávnění.
4. **Zobrazení** – desktop, tablet, telefon a (pro související Akademii) oddělená projekce.
5. **Přístupnost** – klávesnice, fokus, viditelnost, čtečky obrazovky, barevný kontrast.
6. **PDF** – jedna akce stáhne pravý PDF soubor, kompletní obsah a správná čeština, bez tajemství.
7. **Release** – exact-SHA CI a cesta `feature → candidate → protected main`; nevydávat novou příručku na základě neověřeného zdrojového commitu.
8. **Regrese** – při změně UI a workflow opět otevřít příslušný uživatelský scénář, přezkoumat označení poslední revize.

## 8. Pořadí pilotu Etapy B

1. **GIT 7.1.98** – doplnit a opravit skutečné Forms/Sheets/START/END/Verifier postupy.
2. **AI Studio – první spuštění** – oprávnění, AI/API, volba aplikace a bezpečnost.
3. Otestovat oba manuály s kolegou bez technických znalostí.
4. Prototypovat **bezpečný, přímý PDF export** a zdrojovou synchronizaci HTML/PDF.
5. Dále hodnotitel, Maturita Desk, ostatní aplikace; každý obsah přezkoumat podle aktuálního kódu.

> **Před schválením Etapy B:** úspěšná praktická zkouška a účinný PDF mechanismus. Samotný tento standard není implementace ani certifikace.
