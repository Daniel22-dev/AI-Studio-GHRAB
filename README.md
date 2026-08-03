# AI Studio GHRAB

**Aktuální verze: 0.20.2**

**Verze 0.20.2 – federovaný serverless portál a centrální správce GHRAB AI Core 1.0.0.**

AI Studio GHRAB je centrální brána školních digitálních a AI nástrojů. Jednotlivé aplikace zůstávají v samostatných repozitářích; Studio zajišťuje společnou navigaci, Top 4, synchronizaci verzí, bezpečnostní rámec, pracovní materiály, pilotní měření a správu podepsaných přístupů.

## Hlavní novinky 0.20.2

- Opraven regresní test, který po úspěšném nasazení KS 5.9.1 falešně odmítal správný stav `ready`.
- Test nyní ověřuje skutečné souhrnné počty a podporuje živý i přechodový stav manifestu.
- Studio centrálně vydává a ověřuje GHRAB AI Core 1.0.0, runtime politiku a stav migrace aplikací.
- Výchozí režim zůstává `direct-gemini`; School Gateway ani placené API se nezapínají.
- KS 5.9.1 je první živě nasazená referenční integrace; Studio jej po synchronizaci vede jako `ready`.
- Správcovská stránka rozlišuje nasazený stav, lokální certifikaci a dosud nezahájenou migraci.

- Lesson Hub 1.2.0 je osmou chráněnou aplikací AI Studia a zůstává mimo výchozí Top 4 v navazujícím katalogu.
- Studio načítá živý manifest, verzi, stav, popis a aktuální interaktivní manuál přímo z repozitáře Lesson Hubu.
- Přístupová politika vyžaduje školení `LHB-01` ve verzi `2026-09`; správcovský přístup zůstává univerzální.
- Pilotní report rozpoznává pouze povolené technické počty plánů, záznamů výuky, materiálů, importů a exportů záloh. Nezapisuje obsah hodin ani osobní údaje.
- Katalog manuálů, bezpečnostní rámec, diagnostika, registry, offline fallback a QA kontroly jsou rozšířeny z původních sedmi na osm aplikací.

## Starší milník 0.10.0

- Každá chráněná aplikace anonymně eviduje skutečné otevření po ověření přístupu a orientační aktivní čas. Čas se počítá jen při viditelné kartě, zaměřeném okně a nedávné interakci; po pěti minutách nečinnosti se měření zastaví.
- Generátor, Diferenciátor, LUDUS, Korespondenční asistent, Hodnotitel maturitních slohů, ACTIVA a SORTIO zapisují pouze technické počty pokusů, úspěšných výstupů, chyb a zrušení. Nezapisují prompty ani obsah výstupů.
- Správce může zapnout testovací režim. Jeho vývojové a kontrolní použití se ukládá odděleně a nikdy nevstupuje do pilotního reportu.
- Report odděluje moje místní data, importované anonymní souhrny kolegů a celkový součet. Místní data lze z celku jedním přepínačem vyloučit.
- Během posledních sedmi kalendářních dnů měsíce se učitelům nejvýše jednou denně zobrazí zdvořilá prosba o anonymní souhrn, dokud nepotvrdí jeho odeslání.
- Přidán interaktivní návod pro stažení a odeslání souhrnu, včetně práce na dvou zařízeních.
- Report lze stáhnout jako jednostránkové barevné nebo černobílé PDF A4 s logem školy, bránou AI Studia, metrikami po aplikacích, metodickou poznámkou a autorstvím.

## Co se neukládá

Pilotní měření neukládá jména, e-maily, prompty, klávesové vstupy, testové otázky, odpovědi, texty materiálů ani volné poznámky. Aktivní čas je orientační metrika používání, nikoli docházkový nebo kontrolní systém.

## Přístup bez serveru

Veřejný portál obsahuje pouze veřejný EC P-256 klíč. Správce vytvoří podepsaný přístup na stránce `tools/access-issuer/` pomocí soukromého klíče uloženého mimo repozitář. Oprávnění určuje roli, povolené aplikace, datum platnosti a verzi školení.

Bez serveru nelze spolehlivě ověřit totožnost držitele, centrálně synchronizovat zařízení ani automaticky odesílat reporty. Jde o přechodové řešení před školním přihlášením a databází.

## Ochrana přímých adres a měření

Ochranný bootstrap je určen pro Generátor 7.1.4, Diferenciátor 1.3.3, Hodnotitel maturitních slohů 1.5.2, LUDUS 1.16.3, Korespondenčního asistenta 5.9.1, ACTIVA 0.5.0, SORTIO 1.0.2 a Lesson Hub 1.2.0. Stejný centrální modul ověřuje podepsaný přístup a po úspěšném otevření spustí místní měření. Dílčí aplikace navíc hlásí pouze povolené technické typy výstupů.

## Doporučené pořadí nasazení

1. Generátor interaktivních testů 7.1.4.
2. LUDUS 1.16.3.
3. Školní aplikace: Diferenciátor 1.3.3 a Korespondenční asistent 5.9.1.
4. Hodnotitel maturitních slohů 1.5.2.
5. ACTIVA 0.5.0 a SORTIO 1.0.2 včetně volání pilotní telemetrie.
6. Lesson Hub 1.2.0 včetně živého manifestu a aktuálního manuálu.
7. AI Studio GHRAB 0.20.2 jako poslední.

Po zeleném nasazení zavřete staré otevřené karty Studia a znovu je otevřete. Nová verze service workeru se aktivuje až po bezpečném ukončení staré relace; rutinní `Ctrl + F5` už není součástí standardního postupu.

## Lokální kontrola

```bash
npm run sync:offline
npm test
```

Autor a vývojový garant: Daniel Baláž  
Školní projekt Gymnázia, Ostrava-Hrabůvka

## Novinky 0.13.0

- tři skutečné vrstvy prstenců se po kliknutí otáčejí nezávisle a v opačných směrech,
- prstence několikrát zpomalí a uzamknou se místo obyčejného nepřetržitého točení,
- sedm světelných zámků postupně potvrzuje navolení brány,
- stavový štítek zobrazuje jednotlivé fáze otevření,
- animace respektuje plný, lehký, vypnutý i systémově omezený režim pohybu.

## Novinky 0.12.0

- krátká aktivační animace hvězdné brány před otevřením aplikace,
- jednotné hlášení technických chyb ve všech chráněných aplikacích,
- až pět screenshotů, ruční nahrání obrázku a začernění citlivých údajů,
- jeden ZIP balíček s komentářem a bezpečnými technickými údaji,
- předvyplněný e-mail správci a systémové sdílení na podporovaných zařízeních,
- interaktivní návod `manualy/error-report.html`.

## Hlášení chyb 0.12.0

Reporter připravuje detailní e-mail a ZIP s přehledným HTML souhrnem, screenshoty a bezpečnými technickými údaji. Screenshot má ponechat chybu v kontextu; volitelné začernění je určeno jen pro nesouvisející osobní údaje.
