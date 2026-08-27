# Aktualizace AI Studio GHRAB 0.21.0

Datum: 2026-08-10

Tato verze zjednodušuje informační architekturu pilotního Studia. Hlavní zásada je: **jedna horní navigace, oddělený učitelský a správcovský tok, žádné duplicitní rozcestníky a žádné prezentování experimentální interoperability jako hotové univerzální funkce.**

## Vyhodnocení požadavků 1–19

### 1. Plovoucí ovladač „Soukromí a ukončení práce“ — ponecháno

Ovladač je součástí společného GHRAB Platform runtime, nikoli dekorativní prvek Studia. Má být dostupný i uvnitř chráněných aplikací, pokud jej konkrétní integrace výslovně nevypne.

- **Ukončit práci** vymaže data označená v datovém manifestu jako dočasná / určená k vymazání po skončení práce a ukončí serverovou relaci, pokud je aktivní.
- Volba **Sdílený počítač** rozšíří ukončení práce také na lokální data konkrétní aplikace podle jejího datového manifestu.
- **Smazat moje data** provede úplné lokální smazání podle manifestu a v budoucím serverovém profilu může zavolat i podporovaný serverový DELETE endpoint.

Ovladač je záměrně plovoucí, protože jde o bezpečnostní „únikovou cestu“ dostupnou bez hledání v navigaci. Je užitečný zejména na sdílených školních počítačích. Proto byl ponechán a doplněn do společného manuálu.

### 2. Domovský rámeček Aplikace / Materiály / Bezpečnost / Můj přístup — odstraněno

Duplikoval horní navigaci a nepřinášel jinou funkci. Domovská stránka již tento druhý navigační pás neobsahuje.

### 3. Samostatná větev Korespondenčního asistenta — odstraněno

Korespondenční asistent zůstává běžnou aplikací v katalogu stejně jako ostatní. Při růstu na desítky aplikací by zvláštní větev pro jednu aplikaci byla neudržitelná. Obecná myšlenka přenosu obsahu zůstává zachována jen v technické interoperabilní vrstvě.

### 4. Přenos výstupu mezi aplikacemi — ověřeno a zpřesněno

Studio používá GHRAB Studio Bridge v2. Funkční kontrakt `create → validate → peek → take → consume once` je nyní součástí regresního testu.

Aktuální workflow má explicitní kompatibilitu pouze pro:

- Diferenciátor,
- Generátor interaktivních testů,
- LUDUS.

Proto není správné prezentovat přenos jako univerzální funkci všech osmi aplikací. Z běžné navigace byl centrální workflow odstraněn, ale implementace zůstává v repozitáři jako připravený základ pro budoucí / prémiovou interoperabilitu.

### 5. Domovský rámeček „Správcovský režim“ — odstraněno

Správce se ke Správě a Prezentaci dostane v horní navigaci. Duplicitní spodní rozcestník byl odstraněn.

### 6. Oddělení správce a kolegů — zkontrolováno a zpřesněno

**Kolega se standardním platným oprávněním nevidí:**

- horní záložku **Správa**,
- horní záložku **Prezentace**,
- správcovské stránky Automation/Správa, Pilot, Souhrnný report, Interní testy, Vydávání přístupů a Registr přístupů,
- manuál „Automatická evidence, JTI a zneplatnění“.

Při přímém zadání URL je správcovská stránka znovu blokována podle `administratorPages`; nejde jen o CSS skrytí odkazu.

**Správce navíc vidí a používá:**

- Správu,
- Prezentaci,
- Pilotní dashboard a souhrnný report,
- diagnostiku,
- vydávání a evidenci přístupů,
- administrační telemetry režim,
- náhled měsíční prosby.

**Naopak pouze kolega (ne správce) vidí:**

- panel pro stažení měsíčního anonymního souhrnu v **Můj přístup**,
- návod „Jak odevzdat měsíční anonymní souhrn“.

Karty aplikací může vidět celý ekosystém, ale spuštění se řídí digitálně podepsaným oprávněním, seznamem povolených aplikací a aktuální verzí požadovaného školení. Správce má administrátorský override.

### 7. Černá patička a duplicitní odkazy — upraveno

Patička používá modrý povrch odpovídající Studiu. Zůstává v ní autor, škola a verze. Odkazy Bezpečnost / Můj přístup / Změny / Kontrola Studia byly odstraněny, protože patří do horní navigace nebo do Správy.

### 8. Katalog změn — přesunut do horní navigace

**Katalog změn** je veřejná záložka pro všechny přihlášené uživatele. Changelog už není admin-only a jeho duplicitní odkazy ve Správě či patičce byly odstraněny.

### 9. Tvorba materiálů — skryta z běžného pilotu

Původní funkce vytvářela centrální objekt `ghrab-material-v1`, který bylo možné předat podporované aplikaci. V současném modelu ale kolega pracuje primárně přímo ve svých vyškolených aplikacích, takže centrální tvorba je duplicitní.

Záložka byla odstraněna z běžné navigace. Kód zůstává jako budoucí interoperabilní vrstva.

### 10. Materiály — skryty z běžného pilotu

Knihovna ukládá lokální materiály Studia a připravuje je pro handoff. Nejde o serverovou společnou knihovnu a není to jednotné úložiště výstupů všech aplikací. Proto je v dnešním pilotu matoucí.

Záložka byla odstraněna z běžné navigace, ale technický základ zůstává pro budoucí serverový / prémiový scénář.

### 11. Manuály — role u prvních provozních karet

- **Jak odevzdat měsíční anonymní souhrn**: pouze kolega.
- **Automatická evidence, JTI a zneplatnění**: pouze správce.
- **Jak nahlásit chybu bez focení monitoru**: všichni.
- Manuály jednotlivých aplikací: karty mohou být viditelné, otevření se řídí stejným oprávněním jako aplikace; správce může otevřít všechny.

### 12. „Jednotné postupy pro všech osm aplikací“ — aktualizováno

Společný manuál nyní výslovně pracuje s **osmi aplikacemi**, rozlišuje současný serverless pilot a plánovaný školní server a doplňuje:

- pravidla přístupu a školení,
- práci na sdíleném zařízení,
- plovoucí ovladač Soukromí a ukončení práce,
- zálohování a export,
- správný postup při hlášení technické chyby,
- fakt, že interní diagnostika patří správci.

### 13. Bezpečnost — zjednodušeno

„Rychlé posouzení“ bylo přejmenováno na **Rychlou kontrolu dat**. Jde o lokální rozhodovací pomůcku založenou na zaškrtnutých rizicích. **Nečte vložený dokument, neodesílá obsah do AI a neprovádí automatickou analýzu.**

Původní rámečky „Označení kvality“ a „Verzování“ byly odstraněny. „Verzování“ se týkalo stavu a změn centrálního materiálu, nikoli verzí softwaru; po skrytí centrálního materiálového workflow do stránky Bezpečnost nepatří.

### 14. „Poslat správci jen bezpečný souhrn“ — workflow opraveno

Tento panel je nyní **učitelský**, nikoli správcovský.

Workflow:

1. kolega v **Můj přístup** stáhne anonymní JSON za aktuální měsíc,
2. JSON obsahuje provozní součty (spuštění, aktivní čas, technické události), ne jména, prompty ani obsah materiálů,
3. kolega soubor pošle správci běžným domluveným kanálem,
4. správce jej importuje v souhrnném reportu,
5. opakovaný soubor ze stejného zařízení a měsíce je možné nahradit díky náhodnému měsíčnímu `sourceId`.

Správce už panel pro „odeslání správci“ nevidí, protože by posílal data sám sobě.

### 15. Prezentační režim ve Správě — duplicitní karta odstraněna

Prezentace má vlastní horní záložku dostupnou správci. Ve Správě již druhý vstup není.

### 16. Historie změn ve Správě — odstraněna

Historie změn vedla na stejný changelog. Nyní existuje jediný vstup: horní **Katalog změn**.

### 17. Anonymní report ve Správě — samostatná karta odstraněna

Nebyla to jiná funkce než druhá část pilotního reportingu. Zůstává jeden srozumitelný vstup přes Pilotní dashboard.

### 18. Pilotní dashboard a anonymní report — sjednoceno

**Pilotní dashboard** ukazuje lokální pilotní provoz správce / Studia: spuštění, aktivní čas, technické události a stav pilotu.

Z dashboardu vede **Souhrnný report kolegů**, který:

- importuje anonymní měsíční JSON soubory kolegů,
- deduplikuje stejné zařízení + měsíc,
- agreguje výsledky,
- umožňuje vytvořit souhrnný report / PDF.

Správcovský export „anonymního souhrnu pro správce“ byl odstraněn. Tím se odstranila kruhová logika, kdy správce vytvářel soubor určený sám sobě.

### 19. Náhled měsíční prosby — ověřeno

Tlačítko ve Správě volá `setupMonthlyReportReminder({ force: true })`. Vynucený režim obchází běžné omezení na učitelskou roli, poslední dny měsíce, již zobrazenou prosbu a odložení. Regresní test hlídá propojení tlačítka i existenci force větve.

## Ověření release

- `npm test`: PASS,
- dokumentační verze 8 aplikací: PASS,
- hermetická syntax/JSON kontrola: 136 souborů PASS,
- auditní regrese: **31/31 PASS**,
- GHRAB Platform conformance po buildu: **176/176 PASS**,
- Studio UX/regression test: PASS včetně role modelu, reportingového toku, bezpečnostní stránky a handoff v2 kontraktu,
- build 0.21.0: PASS.

V izolovaném pracovním prostředí nebyl nainstalován balíček Playwright, proto zde nebyl spuštěn plný Playwright browser gate. Projekt jej nadále obsahuje jako závislost a GitHub CI jej může po `npm ci` spustit standardním release workflow.

## Návrhy pro další etapu / školní server

Tyto body nebyly v 0.21.0 implementovány, protože dávají plný smysl až se serverem nebo jako samostatná další verze:

1. **Centrum stavu a kompatibility aplikací** — správci ukázat nasazenou verzi, zdraví aplikace, verzi školení a přesnou matici podporovaných importů/exportů. Tím se zabrání dojmu, že každý výstup jde poslat do každé aplikace.
2. **Serverový bezpečný handoff** — místo lokálního `localStorage` předávat artefakt přes krátkodobé serverové úložiště s expirací, kontrolou role a auditní stopou. To je vhodný základ pro skutečnou prémiovou interoperabilitu.
3. **Centrum školení a oprávnění v Můj přístup** — u každé aplikace zobrazit absolvovanou verzi školení, případnou potřebu obnovy a později možnost požádat správce o rozšíření oprávnění.
4. **Cílené systémové oznámení** — serverově řízená servisní hláška pro odstávku, povinnou aktualizaci nebo bezpečnostní upozornění, ideálně pouze uživatelům dotčené aplikace.
5. **Správa relací a retenčních pravidel** — po nasazení serveru umožnit uživateli vidět aktivní relace/zařízení, ukončit je a transparentně zobrazit, co se na serveru uchovává a jak dlouho.

