# Changelog

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
