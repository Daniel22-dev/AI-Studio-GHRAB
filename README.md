# AI Studio GHRAB

**Aktuální verze:** 0.21.85

0.21.84 dokončuje úpravy Správy, sjednocuje release identitu a PWA cache napříč všemi verzovanými povrchy a zpřesňuje fail-closed release proces.

**Performance budget:** precache 1 250 000 B; critical entry 420 000 B; runtime limity jsou povinně měřené v P5 release gate.
**Platforma:** GHRAB Platform 1.1.2 · etapa P5

## Nově v 0.21.84

- **Správa**: stavové karty mají výraznější názvy, rozšířené technické detaily a přímý PDF export.
- **Dočasně povýšit Adélu**: karta zůstává ve Správě a samostatný interaktivní manuál se otevře až po kliknutí na kartu.
- **Release identita a cache**: package, manifest, QA manifest, reporter, consumer a oba PWA cache klíče používají jednotnou verzi 0.21.84.
- **Odolnější deployment verification**: přechodné HTTP 429/5xx a timeouty při čtení release identity mají omezený retry; skutečný kontraktní, verzový nebo hashový nesoulad dál okamžitě blokuje release.
- **Version freshness gate**: runtime změna bez nové release verze se před promotion zablokuje.

## Nově v 0.21.80

- **Source candidate ≠ release**: novější verze nalezená pouze v GitHub repository je `PENDING`, nikoli automaticky přijatá verze.
- **Runtime zůstává na wave baseline**: pokud deployment manifest není dostupný a repository je novější, `apps.generated` zůstane na explicitně přijaté release-wave verzi.
- **Fail-closed zachován**: skutečně nasazená novější MANUAL verze dál blokuje až do ručního reconciliation; starší repository než wave a neověřený snapshot také blokují.
- **Auto-patch policy beze změny**: Generátor, Diferenciátor, Lesson Hub a Maturita Desk nejsou tímto releasem zařazeny do auto-patche.
- **0.21.75 zachován**: visual QA hotfix pro off-screen lazy obrázky zůstává součástí kandidáta.

## Nově v 0.21.75

- **Visual QA + lazy loading**: off-screen `loading="lazy"` obrázek, který browser záměrně ještě nestáhl, se nepovažuje za rozbitý; skutečně rozbitý, eager nebo již viditelný lazy obrázek dál QA zachytí.
- **Phase B optimalizace zůstává aktivní**: lazy ikony extra aplikací se kvůli QA hotfixu nevracejí na eager loading.

## Nově v 0.21.73

- **Release-blocking runtime performance**: `qa:p5:ci` nyní pod referenčním profilem 1366×768 / CPU ×4 skutečně měří a vynucuje render-ready čas, DOM, JS heap, layout a task duration.
- **Skutečný render-ready signál**: startup a první použitelný render mají explicitní Performance API značky; release acceptance vyžaduje nulový počet runtime performance failures.
- **Odlehčená kritická cesta**: 760×760 gateway obraz už není parserem/eager-loadem součástí prvního kritického načtení; po použitelném renderu se načte asynchronně s nízkou prioritou a zachovanými rozměry.
- **Nová kapacitní rezerva**: critical entry klesla přibližně z 499 kB na 360 kB a budget byl současně zpřísněn z 500 kB na 420 kB.
- **Phase D regression**: samostatný test hlídá runtime gate, deferred gateway a critical-entry rezervu proti budoucí regresi.

## Nově v 0.21.71

- **Polling bez zbytečného renderu**: 30sekundová kontrola provozního stavu překreslí portál jen při skutečné změně stavu, nikoli při změně časového razítka.
- **Škálování katalogu**: aplikace mimo Top 4 lazy-loadují ikony a jejich karty používají off-screen rendering přes `content-visibility`.
- **20/30/50 aplikací**: nový `test:performance-phase-b` ověřuje Top 4, úplnost registru, stabilní pořadí a renderovací invarianty.
- **Fáze A zachována**: adaptivní AUTO, FULL/LITE/OFF a lifecycle pause zůstávají beze změny.

## Nově v 0.21.69

- **Report** se po otevření chová jako rozcestník pěti velkých karet. Teprve po výběru se otevře konkrétní agenda; dvoustránkový A4 náhled už nezabírá většinu obrazovky při běžné práci.
- **Pohled kolegy** nabízí Adélu Stillerovou jako zástupce správce a konkrétního kolegu z místní evidence platných oprávnění. Náhled respektuje rozsah aplikací a školení a neumožňuje aplikace spouštět pod skutečným admin oprávněním.
- **Interaktivní manuály** jsou sjednocené s devíti aplikacemi, novým Reportem, rolí zástupce a propojením na AI Akademii.
- **AI Akademie 1.4.6** používá návrat do Studia vlevo nahoře stejně jako ostatní aplikace; PWA-safe návrat a full-admin ověření zůstávají zachované.

## Nově v 0.21.63

- ACTIVA 0.5.27 a SORTIO 1.1.17 jsou přidány do fail-closed GARP 2.5.1 auto-patch policy.
- Jejich release-wave baseline je srovnán na aktuální schválené verze, takže denní synchronizace už nepadá na starém locku.
- Auto-promotion nadále vyžaduje živý deployment a dovolí jen patch; minor/major, rollback, repository fallback a snapshot zůstávají blokované.
- Regresní test politiky akceptuje aktuální verzi vyšší než enrollment minimum, takže po prvním bezpečně přijatém patchi nevznikne nový falešný fail.
- Lesson Hub, Diferenciátor a Generátor zůstávají v režimu manual; změna není plošné povolení auto-update.

## Nově v 0.21.62

- Startup intro se po prvním zobrazení ukládá trvale a běžný návrat do Studia už neblokuje opakovaná několikasekundová animace po každé patch verzi nebo novém spuštění prohlížeče.
- Service worker stahuje volitelné offline soubory po malých dávkách místo desítek souběžných požadavků. HTML stránky, které už patří do cache aktuální verze, se při navigaci otevřou bez čekání na síť.
- Horní navigace i rozcestník Reportu dávají okamžitou vizuální odezvu po kliknutí.
- A4 náhledy Reportu se vykreslují až tehdy, když se panel náhledu blíží do viditelné části stránky; změna titulku je debounce a API spotřeba se pro stejné období znovu nenačítá.
- Rozepsaná karta má akci **Smazat rozepsané zadání** s potvrzením. Uzavřené nebo schválené karty se natvrdo nemažou a nadále používají zrušení/nahrazení kvůli auditní stopě.
- Performance budgety se nezvyšují.

## Nově v 0.21.61

- Horní rozcestník jasně odděluje **Zadání vývoje** jako samostatnou agendu od **Měsíčního reportu**, který má čtyři jednotně zobrazené kroky: Provozní podklady → Evidence práce → Souhrn pro vedení → Náhled a PDF.
- Z karty zadání zmizelo matoucí tlačítko **Vykázat běžnou práci**. Běžná agenda patří přímo do Evidence práce; ke schválenému zadání lze stále připojit konkrétní pracovní záznam.
- Formulář zadání má u každého pole vysvětlení a příklad. Vybraná karta navíc ukazuje stavový postup Návrh → K odsouhlasení → Schváleno → Předáno → Nasazeno.
- Tlačítko pro uzavření nyní výslovně říká, že pouze zmrazí návrh k odsouhlasení. Následující obrazovka vysvětluje, že se PDF přikládá k e-mailu ředitelce nebo jiné oprávněné osobě a že uzavření samo není schválení, dokončení ani povolení provozu.
- Evidence práce a manažerský souhrn mají stručné nápovědy a příklady pro konzistentní měsíční reportování.
- P5 `distBytes` budget je kvůli rozšířené nápovědě Reportu úzce posunut na 2 400 000 B; ostatní performance limity se nezvyšují.

## Nově v 0.21.59

- Report → **Zadání a nové aplikace** vede od návrhu ke schválené verzi, práci, předání a nasazení.
- Každá karta má vlastní ID, verzi a samostatné PDF; změna uzavřeného zadání vytváří novou verzi.
- Dvoustránkový měsíční report uvádí vazby na karty. Nová aplikace může být evidována ještě před zařazením do katalogu.
- Souhlasy se dokládají původními listinami či elektronickými dokumenty; místní stav není podpis. Registr lze zálohovat a obnovit z JSON.

## Převzato z 0.21.58

- Verified ecosystem gate nově umí **řízené auto-patch promotion**: u GARP 2.5.1 zařazené aplikace přijme vyšší patch z živého nasazení bez ručního přepisu `release-wave.json`.
- `release-wave.json` se během QA skrytě nemění; zůstává schváleným baseline lockem pro danou major/minor řadu.
- Repository fallback, snapshot, rollback, prerelease, minor/major změna a drift Platform/repository/storage/cache kontraktů automatické promotion blokují.
- Studio Bridge profil je pro každý enrollment explicitně zamčen: KS a LUDUS používají v2, Hodnotitel `not-applicable`; změna profilu patch promotion zablokuje.
- Přechodová politika má výchozí stav `manual`; auto-patch je nyní aktivní pro Korespondenčního asistenta od 5.10.25, Hodnotitel maturitních slohů od 1.5.25 a LUDUS od 1.16.23. Lesson Hub, Diferenciátor a Generátor zůstávají do uzavření přesné aktuální nezávislé GARP evidence v režimu `manual`.
- Každý verified běh vytváří auditní `qa-results/release-promotion-report.json`.

- Plný správce má v horní navigaci novou záložku **AI Akademie**.
- GitHub Pages používá `/AI-Akademie-GHRAB/`; připravený školní profil `/apps/ai-akademie/`.
- Odkaz předává jen bezpečnou návratovou adresu Studia, nikdy přístupový token.
- Ve **Správě** je nové full-admin tlačítko **API a spotřeba**.
- Přehled ukazuje skutečné náklady, měsíční rozpočet, požadavky, tokeny a rozpad podle projektů, aplikací a modelů, jakmile je zapojen školní server.
- **Měsíční dvoustránkový report** automaticky přebírá API náklady do manažerské druhé strany.
- API/administrátorský klíč zůstává pouze na serveru; klient přijímá jen agregovaná data.
- V horní liště Studia vedle Nastavení je pro plného správce připraven rozbalovací přehled: **online uživatel + právě používaná aplikace**.
- Heartbeat se aktivuje pouze v reálném `school-server` / `server-session` profilu s `schoolServerConnected=true` a `livePresence=true`; serverless provoz nic neodesílá.
- Jméno uživatele se neposílá z klienta. Server jej odvodí z přihlášené školní identity a klient z výsledku použije jen `displayName`, `appId` a `lastSeenAt`.
- Skrytá karta heartbeat neposílá; po focusu jiné aplikace se aktuální `appId` přepíše. Doporučený serverový TTL je 120 sekund.
- Funkce nevytváří historii pohybu mezi aplikacemi a neslouží jako docházka nebo evidence práce. Backend kontrakt je v `docs/LIVE-PRESENCE-SERVER-CONTRACT.md`.

## Zachováno z 0.21.51

- Měsíční report pro vedení má pevně dvě A4: **1/2 Využití AI Studia** a **2/2 Práce garanta a souhrn pro vedení**.
- Druhá strana čerpá z lokální evidence práce garanta a z měsíčního manažerského souhrnu. Evidence umí datum, minuty, kategorii, oblast/aplikaci, pravidelnou či mimořádnou práci, popis činnosti, výsledek a soukromou poznámku.
- Do PDF se agreguje čas podle kategorií a zobrazí se školení/podpora, mimořádná práce, přímé AI náklady, klíčové výsledky, rizika, potřebná rozhodnutí vedení a priority.
- **Soukromá poznámka se do PDF ani anonymního JSON/CSV exportu nikdy nepřenáší.** Anonymní provozní exporty zůstávají obsahově oddělené od osobní pracovní evidence garanta.
- Nezadané přímé náklady se zobrazí jako **Neuvedeno**, ne jako falešná nula. Neplatný nebo nulový čas pracovního záznamu se odmítne.
- V bezserverovém režimu se anonymní měsíční JSON souhrny kolegů nadále importují ručně. Po reálném připojení školního serveru je cílový workflow centralizovaný: provozní data se sesbírají automaticky a správce pouze vygeneruje stejné dvoustránkové PDF.
- PDF generátor nově skládá skutečný vícestránkový dokument; statické regrese hlídají druhou A4 i privacy hranici soukromých poznámek.

### Bezpečnostní základ převzatý z 0.21.43

## Hlavní novinky 0.21.43

- `Smazat moje data` po úplném clear obnoví čerstvou neobsahovou generační tombstone, takže Browser Back nemůže znovu aktivovat starý workflow formulář a autosave.
- Stejný fail-closed helper rotace používá i shared-device `Ukončit práci`; selhání zápisu generační značky je součástí neúspěchu destruktivní operace.
- SIM-03 browser harness používá skutečný `platform-runtime.js` a testuje `endWork` i `deleteMyData`, následný vstup i druhou kartu.
- QA report SIM-03 se zapisuje do `qa-results/`, nikoli do veřejného `dist/`.
- Zachovány jsou předchozí opravy server-session scope, broad storage ownership, handoff kolizí, telemetrie, P5 version driftu a platformy 1.1.2.

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
- Registr Studia je synchronizován s verzemi KS 5.10.25, SORTIO 1.1.17, Lesson Hub 1.2.22, Diferenciátor 1.3.46, ACTIVA 0.5.27, Hodnotitel 1.5.25, LUDUS 1.16.23 a Generátor 7.1.28.

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

1. AI Studio GHRAB 0.21.35 jako zpětně kompatibilní platformní základ.
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
npm run build:school-server
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
