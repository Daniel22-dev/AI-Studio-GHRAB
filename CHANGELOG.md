# Changelog

## 0.12.0 — 2026-07-13

- hlášení chyby ponechává chybovou hlášku, nastavení a potřebný kontext viditelný; začernění je pouze volitelné pro nesouvisející osobní údaje;
- do e-mailu se předvyplní podrobný popis aplikace, verze, postupu, prostředí a bezpečně zachycených technických chyb;
- zachycují se neošetřené JavaScriptové a Promise chyby a chybové HTTP odpovědi bez obsahu požadavků;
- hlavní screenshot se nástroj pokusí zkopírovat do schránky pro vložení do e-mailu pomocí Ctrl+V;
- ZIP obsahuje soubor `00-PREHLED-HLASENI.html`, textový přehled, technický JSON a jednotlivé screenshoty.

## 0.11.0 - 2026-07-13

- krátká prémiová aktivační sekvence centrální brány před otevřením aplikace;
- jednotné tlačítko **Nahlásit chybu** ve všech chráněných aplikacích;
- přímé snímání obrazovky nebo nahrání vlastního obrázku, nejvýše pět snímků;
- vestavěné začernění citlivých údajů před odesláním;
- jediný ZIP balíček s komentářem, bezpečnými technickými údaji a screenshoty;
- předvyplněný e-mail správci a přímé systémové sdílení na podporovaných zařízeních;
- nový interaktivní manuál pro učitele.

## 0.10.0 - 2026-07-13

- jednotné anonymní metriky výstupů ve všech pěti aplikacích;
- oddělené místní, importované a celkové údaje;
- správcovský testovací režim mimo ostrý report;
- připomenutí během posledních sedmi dnů měsíce až do potvrzení odeslání;
- prémiový jednostránkový barevný i černobílý A4 PDF report;
- skutečné školní logo vlevo nahoře, brána AI Studia vpravo nahoře a autorství Daniela Baláže v zápatí;
- interaktivní manuály jsou z měření používání vyloučeny.

## 0.9.0 — 2026-07-13

- spuštění se nově zapíše až po skutečném načtení aplikace a ověření přístupu, takže se počítá i otevření z ikony PWA nebo přímé adresy a nikoli jen kliknutí ve Studiu;
- doplněno anonymní měření aktivního času v jednotlivých aplikacích; počítá se pouze viditelná karta se zaměřeným oknem a po pěti minutách bez interakce se měření zastaví;
- více otevřených karet stejné aplikace se navzájem blokuje, aby se čas nepočítal souběžně, a dlouhé prodlevy uspání počítače se nezapočítávají;
- Generátor testů nyní technicky rozlišuje úspěšné generování, generování ukončené chybou a zrušené pokusy bez ukládání promptů nebo obsahu testu;
- odstraněno ruční vykazování úspory času a hodnocení užitečnosti; pilot používá pouze automatické technické metriky a případové studie správce;
- poslední kalendářní den měsíce se učitelům zobrazí zdvořilá, neblokující prosba o anonymní souhrn s možností stažení, odložení nebo otevření interaktivního návodu;
- přidán pětikrokový interaktivní manuál pro odeslání souhrnu e-mailem a postup při používání dvou zařízení;
- ve Správě je tlačítko pro okamžitý náhled měsíční prosby, takže ji lze ověřit bez čekání na poslední den měsíce;
- anonymní export obsahuje pouze aktuální kalendářní měsíc a náhodný měsíční technický identifikátor prohlížeče; opakovaný souhrn ze stejného zařízení a měsíce v reportu nahradí starší verzi, takže se čísla nezdvojí;
- anonymní export a společný report byly povýšeny na schémata `ghrab-pilot-summary-v7-safe` a `ghrab-impact-report-v5-safe`.
- při prvním otevření verze 0.9.0 Studio jednorázově odstraní staré kopie sdíleného ochranného modulu z PWA cache, aby dílčí aplikace po novém otevření načetly aktuální měření.

## 0.8.3 — 2026-07-13

- doplněn export anonymního pilotního souhrnu přímo ze stránky **Můj přístup**, aby jej mohl poslat každý zapojený kolega;
- vizuální report správce umí importovat více anonymních JSON souhrnů od kolegů a sloučit je do společných čísel;
- pilotní plán byl převeden z 12 týdnů na volné fáze školního roku;
- horní navigace byla zjednodušena: administrátorský rozcestník je **Správa**, samostatný tab **Pilot** už horní lištu neduplikuje;
- skryty duplicitní odkazy v patičce a opravena prezentační lišta, která překrývala text;
- report používá nové logo/bránu místo starého symbolu.

## 0.8.2 — 2026-07-13

- opravena animace hlavního obrazu brány, která rušila středové zarovnání a posouvala portál doprava dolů;
- svislý světelný paprsek nyní při animaci zachovává přesnou středovou osu;
- brána, prstence, paprsek a platforma tvoří jeden soustředný celek bez překrytí karet aplikací.

## 0.8.1 — 2026-07-12

- odstraněno prostorové naklánění brány podle ukazatele, aby centrální portál zůstal vždy opticky přesně vycentrovaný;
- doplněno explicitní vycentrování hlavního obrazu, středového paprsku, platformy a stavového štítku;
- zachovány všechny ostatní animace, světelné efekty i funkce portálu.

## 0.7.2 — 2026-07-12

- manuály se z nainstalované PWA otevírají přímo uvnitř AI Studia, nikoli v nové kartě běžného prohlížeče;
- přidán interní prohlížeč manuálu s kontrolou stejného oprávnění jako u příslušné aplikace;
- zachováno načítání aktuálního manuálu z repozitáře aplikace bez duplicitní kopie ve Studiu;
- doplněno tlačítko zpět, obnovení, nouzové samostatné otevření a podpora celé obrazovky;
- interní prohlížeč je zahrnut do PWA cache a automatických release testů.

## 0.7.1 — 2026-07-12

- opravena poškozená položka **Bezpečnost** v hlavní navigaci, která se zobrazovala jako část HTML kódu;
- oprava aplikována na všechny standardní stránky AI Studia;
- doplněn regresní test platné navigace **Manuály → Bezpečnost**.

## 0.7.0 — 2026-07-12

- přidána samostatná záložka **Manuály** se všemi pěti interaktivními průvodci;
- všechny manuály jsou viditelné, ale otevření dědí stejné podepsané oprávnění jako příslušná aplikace;
- správce otevře všechny manuály, učitel jen průvodce odemčených aplikací;
- manuály zůstávají u jednotlivých aplikací a AI Studio používá jejich `manualUrl`, takže nevzniká zastarávající kopie;
- registr aktualizován na Generátor 7.0.8, Diferenciátor 1.1.1, Hodnotitel 1.3.7, Korespondenčního asistenta 5.0.1 a LUDUS 1.14.6;
- doplněna PWA cache, validace manifestů, jednotná navigace a automatické testy přístupů k manuálům.

## 0.6.3 — 2026-07-11

- přidán Hodnotitel maturitních slohů 1.3.2 jako pátá chráněná aplikace;
- doplněno ID `essay-evaluator`, školení `HOD-01`, claim `app.essay-evaluator.use` a riziková úroveň `high`;
- Hodnotitel zařazen do výchozího Top 4, LUDUS zůstává v katalogu a lze jej připnout;
- přidána lokální ikona, zdroj živého manifestu, offline fallback, PWA cache a integrační bootstrap;
- synchronizace manifestů zachovává lokální ikonu portálu;
- diagnostika a release testy nyní vyžadují pět aplikací;
- repository dispatch Hodnotitele byl sjednocen s automatizací AI Studia.

## 0.6.1 — 2026-07-11

- opravena absolutní adresa Studia v zamykací obrazovce,
- aktualizovány verze všech čtyř chráněných aplikací v centrálním registru,
- dokončena integrace ochrany přímých URL do Generátoru, Diferenciátoru, LUDUSu a Korespondenčního asistenta,
- potvrzeno jednotné přihlášení správce i omezené přístupy učitelů,
- zachováno volné použití exportovaných LUDUS her pro žáky.

## 0.6.0 — 2026-07-10

- zavedena kryptograficky podepsaná bezserverová oprávnění a výchozí uzamčení aplikací,
- odděleno učitelské a správcovské rozhraní,
- přidán vydavatel oprávnění, revokační seznam a integrační ochrana přímých URL,
- přepracována domovská stránka při zachování herního stylu a Top 4,
- oddělena komunikace od výukového workflow,
- zpřesněny materiály, importy, pilotní metriky a report,
- rozšířeny testy, PWA cache a bezpečnost distribučního balíku.

## 0.5.1 — 2026-07-10

- sjednoceny pilotní statusy ve fallbacku i zdrojových manifestech a doplněny release pojistky,
- chráněny zápisy do místního úložiště a doplněno využití úložiště,
- přidán automatický koncept, obnova rozpracované práce a varování před zavřením,
- exportní test nyní používá skutečné transformační funkce s testovacími citlivými daty,
- oddělen učitelem vykázaný čas od automatického orientačního odhadu,
- zpevněny integrační adaptéry a vyčištěny zastaralé artefakty Školních aplikací,
- aktualizována bezpečnostní, serverová a provozní dokumentace.

## 0.4.0 — profesionální audit a serverová připravenost

- Přidána stránka **Změny** přímo v AI Studiu.
- Přidána stránka **Kontrola Studia** s uživatelsky spustitelnými diagnostickými testy.
- Doplněn konfigurační model proškolení, rolí a budoucích serverových oprávnění.
- Rozšířena domovská stránka o vysvětlení, jak bude brána růst při přidávání dalších aplikací.
- Sjednoceno zápatí s vlastníkem/správcem na všech stránkách.
- Rozšířeny automatické testy a opraven duplicitní zápis v animovaném hvězdném pozadí.

## 0.3.0 — dokončení serverless etap

### Propojený pracovní tok
- přidáno samostatné centrum **Pracovní tok**,
- editor společného formátu `ghrab-material-v1`,
- import a export souborů `.ghrab.json`,
- strukturované úlohy pro testování a gamifikaci,
- kontrola povinných údajů a bezpečnostního potvrzení,
- krátkodobá lokální předávka `ghrab-handoff-v1`,
- funkční přímá předávka do Generátoru 7.0.5, Diferenciátoru 1.0.2, LUDUSu 1.14.2 a Korespondenčního asistenta 4.0.2,
- místní pracovní prostor pro maximálně 20 rozpracovaných materiálů.

### Integrace zdrojových aplikací
- Generátor 7.0.5 přebírá metadata, jazyk, CEFR, cíle, zdroj a strukturované úlohy,
- dokončena modularizace Generátoru odstraněním dvou původních monolitických souborů a kolize `SHARED_SCORING_JS`,
- veřejný přístupový manifest Generátoru byl anonymizován,
- Diferenciátor 1.0.2 přebírá materiál, cílovou skupinu a výukové cíle,
- Korespondenční asistent 4.0.2 přebírá anonymní komunikační podklad,
- LUDUS 1.14.2 podporuje handoff i ruční import GHRAB Material / LUDUS_CONTENT v2.

### LUDUS
- přidán převod podporovaných úloh do `LUDUS_CONTENT v2`,
- automatická kontrola počtu převoditelných úloh,
- generování stanic, typů cvičení a bezpečného tematického balíčku,
- přidáno formální JSON schéma `ludus-content-v2.schema.json`.

### Knihovna
- materiály lze otevřít přímo v pracovním toku,
- materiály lze uložit do místního pracovního prostoru,
- lze importovat vlastní balíček GHRAB Material,
- katalog a pracovní prostor jsou oddělené a připravené na pozdější serverovou knihovnu.

### Bezpečnost a kvalita
- bezpečnostní semafor byl rozšířen o čtyřstupňové označení kvality,
- přidán minimální kontrolní seznam před označením „Zkontrolováno učitelem“,
- doplněno pravidlo, že zásadní změna materiálu ruší vyšší stupeň ověření,
- přidáno schéma `ghrab-handoff-v1.schema.json`.

### Pilot a report
- nový pilotní dashboard s aktuálním týdnem, KPI a anonymními záznamy,
- evidence výsledku, užitečnosti a orientační úspory času,
- export anonymního souhrnu `ghrab-pilot-summary-v2`,
- nový vizuální report pro vedení, výroční zprávu a zřizovatele,
- export reportu do JSON a událostí do CSV,
- tisková podoba určená k uložení jako PDF,
- možnost doplnit anonymní případové studie.

### Prezentační režim
- demo dostalo automatické přehrávání,
- přidána časová/progresní lišta,
- přidány poznámky řečníka,
- přidáno ovládání klávesami a přímý přechod do reportu.

### Architektura
- přidán znovupoužitelný `Studio Bridge v1`,
- pracovní prostor, handoff a pilotní události používají oddělené lokální klíče,
- rozšířeny automatické testy a offline PWA jádro,
- zachováno ovládání animací a fullscreen z verze 0.2.1.

## 0.2.1 — výkon a fullscreen
- přidáno tlačítko celé obrazovky,
- přidán automatický, plný, úsporný a vypnutý režim animací,
- optimalizováno hvězdné pozadí a mobilní výkon.

## 0.2.0 — portál a automatizace
- nový sci-fi design portálu,
- animovaný centrální portál,
- řídicí centrum Automatizace,
- manifesty aplikací a automatická synchronizace verzí.

## 0.1.0 — první serverless portál
- společný rozcestník čtyř aplikací,
- demo, knihovna, bezpečnostní centrum a pilotní přehled,
- PWA a automatické nasazení přes GitHub Pages.

## 0.7.3

- Opraveno ořezávání čísla verze na kartách aplikací v mobilním zobrazení.
## 0.8.0

- Nová prémiová hvězdná brána podle původního vizuálního konceptu.
- Vícevrstvé prstence, vír, skenování, světelné odlesky, jiskry a prostorová platforma.
- Jemná reakce na ukazatel v plném režimu a respektování omezení pohybu.
- Zachována funkčnost přístupů, karet aplikací, Top 4, manuálů a PWA.

