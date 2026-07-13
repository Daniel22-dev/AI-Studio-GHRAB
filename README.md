# AI Studio GHRAB

**Verze 0.10.0 - federovaný serverless portál pěti chráněných školních aplikací s anonymním měřením aktivního používání, počty technických výstupů a prémiovým měsíčním reportem PDF.**

AI Studio GHRAB je centrální brána školních digitálních a AI nástrojů. Jednotlivé aplikace zůstávají v samostatných repozitářích; Studio zajišťuje společnou navigaci, Top 4, synchronizaci verzí, bezpečnostní rámec, pracovní materiály, pilotní měření a správu podepsaných přístupů.

## Hlavní novinky 0.10.0

- Každá chráněná aplikace anonymně eviduje skutečné otevření po ověření přístupu a orientační aktivní čas. Čas se počítá jen při viditelné kartě, zaměřeném okně a nedávné interakci; po pěti minutách nečinnosti se měření zastaví.
- Generátor, Diferenciátor, LUDUS, Korespondenční asistent a Hodnotitel maturitních slohů zapisují pouze technické počty pokusů, úspěšných výstupů, chyb a zrušení. Nezapisují prompty ani obsah výstupů.
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

Ochranný bootstrap je integrován v Generátoru 7.1.0, Diferenciátoru 1.2.0, Hodnotiteli maturitních slohů 1.4.0, LUDUSu 1.15.0 a Korespondenčním asistentovi 5.1.0. Stejný centrální modul ověřuje podepsaný přístup a po úspěšném otevření spustí místní měření. Dílčí aplikace navíc hlásí pouze povolené technické typy výstupů.

## Doporučené pořadí nasazení

1. Generátor interaktivních testů 7.1.0.
2. LUDUS 1.15.0.
3. Školní aplikace: Diferenciátor 1.2.0 a Korespondenční asistent 5.1.0.
4. Hodnotitel maturitních slohů 1.4.0.
5. AI Studio GHRAB 0.10.0 jako poslední.

Po zeleném nasazení otevřete AI Studio, proveďte `Ctrl + F5`, úplně ukončete staré karty nebo nainstalované PWA dílčích aplikací a znovu je otevřete přes Studio.

## Lokální kontrola

```bash
npm run sync:offline
npm test
```

Autor a vývojový garant: Daniel Baláž  
Školní projekt Gymnázia, Ostrava-Hrabůvka

## Novinky 0.12.0

- krátká aktivační animace hvězdné brány před otevřením aplikace,
- jednotné hlášení technických chyb ve všech chráněných aplikacích,
- až pět screenshotů, ruční nahrání obrázku a začernění citlivých údajů,
- jeden ZIP balíček s komentářem a bezpečnými technickými údaji,
- předvyplněný e-mail správci a systémové sdílení na podporovaných zařízeních,
- interaktivní návod `manualy/error-report.html`.

## Hlášení chyb 0.12.0

Reporter připravuje detailní e-mail a ZIP s přehledným HTML souhrnem, screenshoty a bezpečnými technickými údaji. Screenshot má ponechat chybu v kontextu; volitelné začernění je určeno jen pro nesouvisející osobní údaje.
