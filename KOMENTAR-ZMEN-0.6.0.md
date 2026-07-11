# AI Studio GHRAB 0.6.0 – komentář provedených změn

## 1. Přístup bez serveru

Původní lokální demonstrační přepínač byl odstraněn. Všechny aplikace jsou nyní ve výchozím stavu uzamčené a Studio přijímá pouze digitálně podepsané oprávnění. Veřejný repozitář obsahuje jen veřejný ověřovací klíč. Soukromý klíč a správcovské oprávnění jsou v samostatném neveřejném balíčku.

Správce může vydat přístup pro konkrétní aplikace, roli a dobu platnosti. Oprávnění lze centrálně zneplatnit přidáním jeho `jti` do `src/config/revoked-access.json`.

## 2. Ochrana přímých adres aplikací

Do Studia byl přidán modul `access/app-guard.js` a čtyři připravené bootstrap šablony v `integration/`. Přímou adresu jednotlivé aplikace lze skutečně uzamknout až po vložení příslušného bootstrapu do samostatného repozitáře dané aplikace. Zdrojové kódy těchto čtyř aplikací nebyly součástí dodaného balíku, proto jsou změny připraveny jako přesný integrační balíček.

## 3. Učitelské a správcovské rozhraní

Běžný učitel vidí Aplikace, Tvorbu materiálů, Materiály, Bezpečnost a Můj přístup. Správa, pilot, report, diagnostika, historie změn a prezentační režim jsou dostupné pouze s platným správcovským oprávněním.

Správní stránka byla přepracována na skutečné řídicí centrum s odkazy na vydávání oprávnění, diagnostiku, pilot, report, prezentaci a historii změn.

## 4. Domovská stránka a obsah

Herní sci-fi styl i Top 4 zůstaly zachovány. Výukový tok nyní končí LUDUSem; Korespondenční asistent je správně oddělen jako samostatná větev komunikace a administrativy. Stav portálu rozlišuje živě ověřené manifesty, ověřenou záložní konfiguraci a chybu.

## 5. Vizuální a UX úpravy

Navigace byla zjednodušena. Jazyk, režim animací a celá obrazovka jsou v jednom menu Nastavení. Světlý režim byl odstraněn, protože nebyl ve všech komponentách dotažený. Ikony aplikací mají jednotný rámeček, podklad a stín, přičemž původní herní identita zůstala zachována.

## 6. Materiály a import

Sekce byla přejmenována na Ukázkové a místní materiály. Rozhraní výslovně vysvětluje, že nejde o centrální školní databázi. Import kontroluje velikost souboru, JSON, schema, povinná pole, délky textů, počet úloh, obtížnost a stav kvality.

## 7. Pilot a report

Spuštění jsou označena jako „spuštění ze Studia v tomto prohlížeči“. Učitelem vykázaná úspora času zůstává hlavní metrikou; automatický odhad je zřetelně označen jako doplňkový a orientační.

## 8. Technická stabilita

Opraveno hromadění globálních posluchačů při opakovaném vykreslení karet. Administrátorské moduly se nespouštějí bez oprávnění. Rozšířena offline cache, diagnostika a automatické kontroly. Ve veřejném ZIPu se kontroluje nepřítomnost soukromého klíče i přístupových souborů.
