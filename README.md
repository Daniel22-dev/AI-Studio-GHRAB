# AI Studio GHRAB

**Aktuální verze:** 0.20.19
**Platforma:** GHRAB Platform 1.1.0 · etapa P5

**Verze 0.20.19 – nezávisle ověřené opravy auditu 0.20.17/0.20.18 a zpřísnění release bran.**

AI Studio GHRAB je centrální brána školních digitálních a AI nástrojů. Jednotlivé aplikace zůstávají v samostatných repozitářích; Studio zajišťuje společnou navigaci, Top 4, synchronizaci verzí, bezpečnostní rámec, pracovní materiály, pilotní měření, správu podepsaných přístupů a kanonický základ technického reportéru.

## Hlavní novinky 0.20.19

- Opraven offline start Studia: přístupové moduly používají síť jako první volbu, ale při výpadku mají cache fallback.
- Release gate už nemůže propustit neúspěšný browser report přes chybějící `summary.failed`; CI axe běží povinně a fail-closed.
- School-server build po profilových změnách znovu čistí precache, odvozuje P5 a feature flagy z kontraktu a neobsahuje mrtvé serverové šablony.
- CSP serverového profilu odpovídá aplikaci bez `unsafe-inline`; přidána automatická kontrola shody a HSTS pro školní HTTPS host.
- Opraveno zachování volby vypnutých animací, opakované překládání souhrnu synchronizace a platformní metadata PWA.
- Doplněny chybějící verze changelogu, automatická kontrola verzí aplikací v dokumentaci a viewport 390×844 ve vizuální bráně.
- CI už nespouští pět redundantních plných auditů na stejný commit; historické/ruční vstupy zůstávají dostupné bez automatického duplikování.

## Předchozí vydání 0.20.18

**Verze 0.20.18 – zarovnání s opraveným Korespondenčním asistentem 5.9.21 po reprodukci skutečného embedded bootstrapu.**

## Hlavní novinky 0.20.18

- Produkční reprodukce celé cesty Studio → iframe → GHRAB Platform → KS odhalila skutečnou příčinu obecné přístupové chyby v KS 5.9.20: TDZ pád `geminiModel` před dokončením `ksAppReady`.
- Registr Studia je aktualizován na opravený Korespondenční asistent 5.9.21 a cache `ghrab-correspondence-v5.9.21`; samotná runtime oprava je v repozitáři KS.
- Přístupový kontrakt ani vydané přístupové tokeny se nemění; launch URL Korespondenčního asistenta zůstává stejná.
- Zachovány jsou opravy 0.20.17 pro čekání na lokální platformní unlock, PWA aktualizace a CI browser gate i opravy ovládání/cache z 0.20.15–0.20.16.

## Zachováno z platformního vydání 0.20.14

- GHRAB Platform 1.1.0 sjednocuje branding, motiv, úložiště, Studio Bridge, artefakty a PWA aktualizace ve všech devíti projektech.
- Všechny aplikace používají jeden kanonický školní logotyp bez inline base64 kopií a jednotnou autorskou patičku.
- Aplikační data mají namespace `ghrab.<appId>.*`; historické klíče se migrují vratně a před změnou vzniká úplná záloha.
- Studio Bridge v2 zachovává kompatibilitu se starším handoffem v1 a strukturované exporty používají artifact envelope v1 se SHA-256.
- Registr Studia je synchronizován s verzemi KS 5.9.21, SORTIO 1.0.9, Lesson Hub 1.2.6, Diferenciátor 1.3.10, ACTIVA 0.5.7, Hodnotitel 1.5.8, LUDUS 1.16.9 a Generátor 7.1.10.

## Serverová vrstva z P1

Školní relace, GHRAB AI Core, School Gateway, CSP, datové manifesty a privacy-safe observability z verze 0.20.9 zůstávají zachovány.

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

Ochranný bootstrap je určen pro Generátor 7.1.8, Diferenciátor 1.3.8, Hodnotitel maturitních slohů 1.5.6, LUDUS 1.16.7, Korespondenčního asistenta 5.9.15, ACTIVA 0.5.5, SORTIO 1.0.7 a Lesson Hub 1.2.4. Stejný centrální modul ověřuje podepsaný přístup a po úspěšném otevření spustí místní měření. Dílčí aplikace navíc hlásí pouze povolené technické typy výstupů.

## Doporučené pořadí nasazení P2

1. AI Studio GHRAB 0.20.19 jako zpětně kompatibilní platformní základ.
2. Korespondenční asistent 5.9.15.
3. Diferenciátor 1.3.8.
4. Generátor testů 7.1.8.
5. Hodnotitel maturitních slohů 1.5.6.
6. ACTIVA 0.5.5.
7. LUDUS 1.16.7.
8. Lesson Hub 1.2.4.
9. SORTIO 1.0.7.
10. V AI Studiu spustit závěrečnou synchronizaci a certifikaci registru.

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
