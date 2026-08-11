# Aktualizace AI Studio GHRAB 0.21.5

## Co bylo opraveno po vizuální kontrole

Patička už není nahrazována automatickou platformní patičkou a má na všech standardních stránkách stejný lehký modrý styl bez černého rámečku. Katalog změn se při prvním načtení neskrývá za access gate; má vlastní stabilní načítací panel, takže nedochází k probliknutí samotného autorství.

Rychlá kontrola v Bezpečnosti nově zobrazuje skutečný tříbarevný semafor. Vedle barvy vždy vypíše i textový verdikt ZELENÁ / ORANŽOVÁ / ČERVENÁ, takže výsledek není závislý pouze na barvě.

## Top 4 kolem brány

Každá karta Top 4 má přesouvací úchyt. Přetažením jedné karty na jinou se jejich dvě pozice prohodí a nové rozložení se uloží do stejné lokální preference jako Top 4. Klávesnicí lze pozice měnit šipkami. Na úzkém mobilním rozložení se úchyt skrývá, protože tam karty nejsou rozmístěné kolem brány.

## Pohled kolegy

Správce vidí v hlavní navigaci novou záložku **Pohled kolegy**. Aktivuje session náhled modelového proškoleného učitele se všemi aktuálně dostupnými aplikacemi. Správcovské položky a části se v náhledu skryjí, učitelské části se zobrazí a Můj přístup vysvětluje, že jde o simulaci. Podepsané správcovské oprávnění se nemění a v náhledu je zablokována jeho změna nebo odstranění. Horní informační pruh umožňuje náhled kdykoli ukončit.

Jde o modelový pohled plně proškoleného kolegy, nikoli o impersonaci konkrétní osoby. Proto nečte ani nemění cizí účet nebo permit.

## Prezentace a PR

Původní technická pětikroková ukázka byla nahrazena prezentační stránkou pro projektor, návštěvy a dny otevřených dveří. Živý showcase umí v nekonečné smyčce střídat hlavní myšlenky a všech osm aplikací kolem centrální brány. Je k dispozici celoobrazovkový režim.

Konfigurace `src/config/presentation.json` podporuje budoucí jedno či více lokálních MP4 videí. Jakmile se doplní soubory a jejich záznamy, stránka je nabídne jako videa a tlačítko nekonečné smyčky z nich vytvoří playlist. Release 0.21.5 žádné fiktivní video nepředstírá; bez MP4 běží živý animovaný showcase.

## Materiály — přímé uložení z aplikace

AI Studio nově přijímá jednorázový GHRAB Platform Bridge v2 handoff s cílem `ai-studio` na stránce Materiály a po validaci ho ukládá do Mých materiálů. V `src/integration/save-to-studio.js` a `SAVE-TO-STUDIO.md` je společný kontrakt pro tlačítko **Uložit do AI Studia**, který mohou převzít všechny samostatné aplikace.

Tím není tvrzeno, že už bylo tlačítko fyzicky přidáno do všech osmi externích repozitářů. Přijímací strana a jednotný kontrakt Studia jsou připravené; jednotlivé aplikace se na něj mohou napojovat bez osmi rozdílných řešení. V GitHub/serverless profilu zůstává takto uložený materiál lokální. Sdílení s předmětovou komisí se aktivuje až se školním serverem.

## Kontrola zdrojů

Synchronizační report nyní uchovává `lastLiveVerifiedAt` pro každý manifest a `lastFullLiveVerifiedAt` pro poslední úplné živé ověření 8/8. Pokud živý fetch selže, starší platný údaj se neztratí.

Správa místo nejasného „Použit záložní registr / manifestů ověřeno 0/8“ ukazuje zvlášť:

- kolik manifestů bylo ověřeno živě při poslední synchronizaci;
- kolik aplikací bylo převzato ze záložního snapshotu;
- zdroj registru;
- poslední úplné živé ověření 8/8;
- poslední synchronizaci a u každé aplikace čas posledního živého ověření.

Nasazovací workflow nadále provádí živou synchronizaci před buildem. Lokální fallback report v repozitáři může mít datum živého ověření prázdné, dokud nový deploy poprvé neprovede úspěšné živé načtení.
