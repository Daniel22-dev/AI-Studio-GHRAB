# Changelog

> Tento soubor se generuje ze `src/config/changelog.json`. Neupravujte jej ručně.

## 0.17.0 — 2026-07-15

**Čistý základ, dvoufázové spuštění a instalace na PC**

- Základem je aktualizovaná verze 0.15.0 před 3D experimenty; domovská obrazovka neobsahuje naklánění, holografické štítky ani rušivé prostorové dekorace.
- Po kliknutí na aplikaci se nejprve dvě sekundy mechanicky otáčejí prstence centrální brány a teprve potom se otevře samostatná barevně přizpůsobená animace vybrané aplikace.
- Na domovské stránce se vpravo dole na počítači zobrazuje nabídka Nainstalovat AI Studio; při dostupné systémové výzvě spustí instalaci přímo, jinak zobrazí přesný postup pro Chrome nebo Edge.
- Synchronizace registru v GitHub Actions automaticky formátuje generované JSON soubory a instalace používá veřejný npm registr, aby nasazení nezamrzalo ani nepadalo na Prettieru.

## 0.15.0 — 2026-07-15

**Procesní a bezpečnostní zpevnění po hloubkovém auditu**

- Přístup k aplikaci nyní skutečně vyžaduje přesnou aktuální verzi předepsaného školení; zastaralé nebo chybějící potvrzení aplikaci uzamkne.
- Veřejné ověřovací klíče používají sadu klíčů s aktivním kid, takže budoucí rotace může proběhnout s překryvem bez hromadného výpadku oprávnění.
- Maximální platnost oprávnění byla zkrácena ze tří let na 400 dní a vydavatel automaticky zapomíná soukromý klíč po 10 minutách nečinnosti.
- Odstraněny duplicitní zdroje pravdy pro aplikace a školení; changelog, PWA cache a kontrolní testy se nyní generují nebo ověřují automaticky.
- Service worker používá cache-first pro statické soubory, network-first pro konfiguraci a neprovádí okamžité převzetí otevřených karet.
- PWA manifest má stabilní identitu, synchronizační report ve zdrojích už nepředstírá síťové ověření a automatická pojistná synchronizace běží jednou denně.

## 0.14.4 — 2026-07-14

**Jednotná navigace správcovských nástrojů**

- Evidence přístupů a Vydání přístupu nyní zobrazují stejné hlavní záložky jako ostatní části AI Studia.
- Při otevření těchto nástrojů zůstává v horní navigaci správně zvýrazněná záložka Správa.
- Doplněna automatická regresní kontrola úplnosti navigace na obou správcovských stránkách.
- Soubory stránky Vydání přístupu používají verzované adresy, aby se po aktualizaci nenačetla stará kopie z mezipaměti.

## 0.14.3 — 2026-07-14

**Spolehlivá oprava neúplného importu přístupu**

- Import přístupového souboru nyní výslovně sestaví kompletní záznam a přepíše starý neúplný záznam se stejným JTI.
- Po importu Studio kontroluje, zda se skutečně uložilo interní ID, platnost a seznam aplikací; neúplný výsledek už neohlásí jako úspěch.
- Importní modul zobrazuje svou verzi a po úspěchu vypíše načtené jméno, interní ID, platnost a počet aplikací.
- Skripty evidence používají verzované adresy, aby se po aktualizaci nenačetla stará kopie z mezipaměti prohlížeče nebo PWA.

## 0.14.2 — 2026-07-14

**Oprava načítání platnosti ze starších přístupových souborů**

- Při importu původního souboru .ghrab-access.json má nyní podepsaný token přednost před pomocným permitId, takže Studio správně načte interní ID, aplikace, školení a konec platnosti.
- Opětovný import stejného souboru opraví již neúplný záznam podle stejného JTI a nevytvoří duplicitu.
- Doplněna regresní kontrola pořadí rozpoznávání přístupového souboru a zálohy evidence.

## 0.14.1 — 2026-07-14

**Spolehlivý import evidence a soukromý jednorázový odkaz**

- Nahrazeno programové otevírání skrytého výběru souboru nativním ovládáním, které funguje spolehlivěji v běžném prohlížeči i nainstalované PWA.
- Jediné tlačítko nyní samo rozpozná přístupový soubor, zálohu evidence, pole záznamů i samostatný záznam; doplněno přetažení souboru a přesná chybová hlášení.
- Přidán soukromý jednorázový import přes fragment adresy. Osobní data se neposílají serveru a po načtení se z adresního řádku okamžitě odstraní.
- Import po úspěchu viditelně potvrdí počet záznamů a přesune správce k aktualizovanému seznamu.

## 0.14.0 — 2026-07-14

**Automatická evidence vydaných přístupů**

- Každý nově podepsaný přístup se po vytvoření automaticky uloží do místní správcovské evidence včetně uživatele, aplikací, platnosti a JTI.
- Správce může vyhledávat, filtrovat, kopírovat JTI, doplňovat poznámky, obnovit přístup s předvyplněnými údaji a importovat již vydané přístupové soubory.
- Evidence podporuje bezpečnou zálohu JSON, přehled CSV a automatické vytvoření hotového souboru revoked-access.json z označených přístupů.
- Evidence zůstává pouze v prohlížeči správce a neukládá soukromý podpisový klíč ani dlouhé přístupové kódy kolegů.

## 0.13.0 — 2026-07-13

**Mechanicky se pohybující prstence hvězdné brány**

- Po kliknutí na aplikaci se tři samostatné grafické vrstvy prstenců roztočí různými směry, několikrát se mechanicky zastaví a na konci se přesně zarovnají.
- Sedm světelných zámků se aktivuje postupně kolem obvodu a vizuálně potvrzuje jednotlivé kroky navolení brány.
- Stavový štítek během sekvence postupně zobrazuje navolování aplikace, výpočet souřadnic, uzamykání prstenců a otevření brány.
- Plný režim používá filmovou sekvenci dlouhou 2,85 sekundy; lehký, vypnutý a systémově omezený pohyb mají samostatné šetrné varianty.

## 0.12.0 — 2026-07-13

**Diagnostické hlášení chyby připravené pro správce a vývojáře**

- Hlášení už nevyžaduje začerňování; screenshot má ponechat chybu, nastavení a diagnostický kontext viditelné. Volitelně lze skrýt pouze nesouvisející osobní údaje.
- E-mail obsahuje název a verzi aplikace, popis, postup k zopakování, bezpečně zachycené technické chyby, HTTP stavy a prostředí.
- ZIP nově obsahuje samostatné přehledné HTML hlášení se screenshoty, textový souhrn a technický JSON.
- Nástroj se pokusí zkopírovat hlavní screenshot do schránky, aby jej učitel mohl vložit přímo do e-mailu pomocí Ctrl+V.

## 0.11.0 — 2026-07-13

**Aktivační animace brány a bezpečné hlášení chyb**

- Po spuštění aplikace se centrální prstence brány na krátkou dobu zrychlí, brána se energeticky aktivuje a teprve poté se otevře vybraný nástroj.
- Všechny chráněné aplikace získaly jednotné tlačítko Nahlásit chybu bez nutnosti upravovat jejich jednotlivá rozhraní.
- Nástroj podporuje přímé snímání obrazovky, až pět screenshotů, nahrání obrázku z disku a vestavěné začernění citlivých údajů.
- Hlášení se uloží jako jediný ZIP s komentářem, bezpečnými technickými údaji a zvolenými snímky; následně se otevře předvyplněný e-mail správci.
- Přidán interaktivní návod k hlášení chyb a progresivní systémové sdílení souboru na podporovaných zařízeních.

## 0.10.0 — 2026-07-13

**Kompletní telemetrie výstupů a prémiový PDF report**

- Všech pět aplikací zapisuje jednotné anonymní technické metriky výstupů: požadovaný, úspěšný, chybný a zrušený počet podle typu aplikace.
- Report odděluje moje místní používání, importované souhrny kolegů a celkový součet; místní data lze z celku vypnout.
- Správce má testovací režim měření, který ukládá vývojová spuštění, aktivní čas a výstupy odděleně a nikdy je nezahrne do reportu.
- Zdvořilá prosba o měsíční souhrn se zobrazuje každý den během posledních sedmi dnů měsíce, dokud uživatel nepotvrdí odeslání.
- Přidán přímý export jednostránkového barevného i černobílého A4 PDF se školním logem, skutečnou bránou AI Studia, přehledem aplikací, metodikou a autorstvím.
- Čtení interaktivních manuálů se nezapočítává jako používání dílčích aplikací.

## 0.9.0 — 2026-07-13

**Aktivní čas, výsledky generování a měsíční souhrny**

- Spuštění se zapíše až po skutečném načtení aplikace a ověření přístupu, včetně otevření z ikony PWA nebo přímé adresy.
- Aplikace anonymně měří přibližný aktivní čas pouze při viditelné kartě, zaměřeném okně a nedávné interakci; po pěti minutách nečinnosti se měření zastaví.
- Generátor rozlišuje úspěšné, chybové a zrušené pokusy bez ukládání promptů, otázek, odpovědí nebo obsahu testu.
- Ruční vykazování úspory času bylo odstraněno a pilotní přehled používá automatické technické metriky.
- Poslední den měsíce se učitelům zobrazí zdvořilá neblokující prosba o anonymní souhrn s možností stažení, odložení a otevření interaktivního návodu.
- Přidán pětikrokový návod pro odeslání souhrnu a postup pro práci na jednom nebo více zařízeních.
- Souhrn obsahuje pouze aktuální kalendářní měsíc; náhodný měsíční technický identifikátor prohlížeče umožní nahradit opakovaný soubor ze stejného zařízení a měsíce bez zdvojení dat.
- Správce může měsíční prosbu kdykoli otevřít v náhledovém režimu ze Správy, bez čekání na konec měsíce.
- Studio při prvním otevření nové verze jednorázově odstraní staré kopie sdíleného ochranného modulu z PWA cache.

## 0.8.3 — 2026-07-13

**Anonymní souhrny a sjednocení pilotu**

- Kolega si může ze stránky Můj přístup stáhnout bezpečný anonymní souhrn pro správce pilotu.
- Report správce umí importovat více anonymních souhrnů a sloučit je s místními daty do jednoho přehledu.
- Pilot byl převeden z pevného 12týdenního plánu na volné fáze školního roku.
- V horní navigaci zůstává Správa jako hlavní administrátorský rozcestník; samostatná záložka Pilot byla z horní lišty odstraněna.
- Patičkové duplicitní odkazy jsou skryté a prezentační lišta již nepřekrývá úvodní text.

## 0.8.2 — 2026-07-13

**Oprava posunuté brány**

- Opravena animace hlavního obrazu brány, která při plném režimu přepisovala středové zarovnání a posouvala portál doprava dolů.
- Svislý světelný paprsek nyní při animaci rovněž zachovává přesnou středovou osu.
- Brána, prstence, paprsek a platforma nyní tvoří jeden soustředný celek bez překrytí karet aplikací.

## 0.8.1 — 2026-07-12

**Vycentrovaná hvězdná brána**

- Odstraněno prostorové naklánění podle pohybu ukazatele, aby centrální prstenec a světelné kruhy zůstaly vždy opticky souměrné.
- Hlavní obraz brány, vertikální paprsek, platforma i stavový štítek nyní používají pevné středové zarovnání.
- Ostatní animace, světelné efekty a funkce AI Studia zůstaly zachovány beze změny.

## 0.8.0 — 2026-07-12

**Prémiová animovaná hvězdná brána**

- Úvodní rozcestník získal novou centrální bránu vycházející z původního vizuálního konceptu AI Studia.
- Doplněny vícevrstvé světelné prstence, energetický vír, skenovací paprsek, jiskry, odlesky, prostorová platforma a jemná reakce na pohyb ukazatele.
- Animace respektují plný, úsporný a vypnutý režim i systémové omezení pohybu; mobilní rozložení zůstává zachováno.
- Funkčnost karet, podepsaná oprávnění, Top 4, PWA a přímé spouštění aplikací zůstaly beze změny.

## 0.7.3 — 2026-07-12

**Oprava čísla verze na mobilních kartách**

- Číslo verze aplikace se na úzkých displejích již neořezává mimo pravý okraj karty.
- Horní část karty se na telefonu bezpečně přeskupí do dvou řádků a ovládací prvky zůstanou zarovnané doprava.
- Stavový štítek se může zalomit bez přetečení; desktopové rozložení zůstává beze změny.

## 0.7.2 — 2026-07-12

**Manuály otevřené přímo v nainstalovaném AI Studiu**

- Kliknutí na odemčený manuál nyní otevře interní prohlížeč v rámci AI Studia místo nové karty běžného prohlížeče.
- Interní prohlížeč ověřuje stejné oprávnění jako katalog a načítá aktuální manuál přímo z repozitáře příslušné aplikace.
- Doplněna horní lišta se návratem do katalogu, obnovením a nouzovou možností otevřít manuál samostatně.
- Vložený manuál zachovává své interaktivní prvky a tlačítko celé obrazovky; prohlížeč manuálu je součástí PWA cache a release testů.

## 0.7.1 — 2026-07-12

**Oprava navigace po přidání manuálů**

- Opravena poškozená HTML značka položky Bezpečnost, která se na stránkách zobrazovala jako zdrojový text.
- Oprava byla provedena na všech standardních stránkách AI Studia, včetně správcovských částí.
- Automatické testy nyní kontrolují přítomnost platné položky Bezpečnost a odmítnou obdobně poškozenou navigaci.

## 0.7.0 — 2026-07-12

**Interaktivní manuály přímo v AI Studiu**

- Přidána samostatná záložka Manuály se všemi pěti interaktivními průvodci.
- Všechny karty jsou viditelné, ale otevření manuálu se řídí stejným podepsaným oprávněním jako příslušná aplikace; správce otevře všechny.
- Manuály se načítají z adres publikovaných v manifestech aplikací, takže nevzniká druhá zastarávající kopie v AI Studiu.
- Aktualizován centrální registr na Generátor 7.0.8, Diferenciátor 1.1.1, Hodnotitel 1.3.7, Korespondenčního asistenta 5.0.1 a LUDUS 1.14.6.
- Rozšířena PWA cache, manifestový kontrakt, interní odkazy a automatické release testy.

## 0.6.3 — 2026-07-11

**Hodnotitel maturitních slohů připojen do ekosystému**

- Přidán Hodnotitel maturitních slohů 1.3.2 jako pátá chráněná aplikace s ID essay-evaluator, školením HOD-01 a rizikovou úrovní high.
- Hodnotitel je ve výchozím Top 4; LUDUS zůstává plně dostupný v katalogu a lze jej připnout mezi priority.
- Doplněna lokální ikona, živý manifest, offline fallback, PWA cache, diagnostika, integrační šablona a vydávání podepsaných oprávnění.
- Synchronizace manifestů nyní zachovává důvěryhodnou lokální ikonu portálu i tehdy, když zdrojový manifest používá vzdálenou adresu ikony.
- Sjednocen repository dispatch Hodnotitele s událostí app-updated, kterou AI Studio přijímá.

## 0.6.1 — 2026-07-11

**Dokončené uzamykání přímých adres aplikací**

- Opravena tvorba odkazů na AI Studio v zamykací obrazovce; relativní cesta se nyní vždy bezpečně převede na úplnou adresu.
- Centrální registr byl aktualizován na Generátor 7.0.6, Diferenciátor 1.0.3, LUDUS 1.14.3 a Korespondenčního asistenta 4.0.3.
- Integrační ochrana byla vložena přímo do všech čtyř aplikací, takže přímá veřejná adresa již neobchází přístup aktivovaný ve Studiu.
- Správce aktivuje jediný podepsaný přístup ve Studiu a všechny aplikace jej ověřují ze společného úložiště stejné domény.
- LUDUS chrání dílnu i veřejné enginy, ale z exportovaných studentských her ochranu záměrně odstraňuje.

## 0.6.0 — 2026-07-10

**Profesionální rozcestník a podepsaný přístup po školení**

- Nahrazen veřejný lokální demonstrační zámek kryptograficky podepsanými oprávněními s výchozím stavem všech aplikací uzamčeno.
- Přidána stránka Můj přístup, místní vydavatel oprávnění, veřejný revokační seznam a oddělený soukromý administrátorský balíček.
- Připraven ochranný bootstrap pro Generátor, Diferenciátor, LUDUS a Korespondenčního asistenta, který po vložení do jejich repozitářů chrání i přímé adresy.
- Odděleno učitelské a správcovské rozhraní; technické, pilotní, reportovací a prezentační stránky vyžadují správcovské oprávnění.
- Přepracována domovská stránka při zachování herního portálu a Top 4; komunikace je oddělena od lineárního výukového workflow.
- Sjednocena vizuální úprava ikon, zjednodušena navigace a nastavení jazyka, animací a celé obrazovky jsou sloučena do jednoho menu.
- Knihovna byla zpřesněna na Ukázkové a místní materiály a importy nyní procházejí hloubkovou validací velikosti, struktury a povinných polí.
- Pilotní a reportovací metriky přesně uvádějí, že jde o místní spuštění ze Studia; učiteli vykázaný čas je oddělen od orientačního odhadu.
- Rozšířena diagnostika, PWA cache, testy soukromých klíčů, validace interních odkazů a kontrola celého distribučního balíku.

## 0.5.1 — 2026-07-10

**Zpevnění před pilotem podle nezávislého hloubkového auditu**

- Sjednoceny pilotní statusy ve Studiu i ve zdrojových manifestech; automatická validace nyní odmítne předčasné označení produkčního školního provozu.
- Veškeré zápisy do místního úložiště jsou chráněny proti zaplnění nebo zablokování; uživatel dostane srozumitelnou zprávu a není klamně informován o úspěšném uložení.
- Pracovní tok automaticky ukládá rozpracovaný koncept, umí jej obnovit a před zavřením upozorní na neuložené změny.
- Kontrola anonymních exportů používá skutečné exportní funkce s testovacími citlivými daty; CI testuje stejnou transformaci.
- Report odděluje minuty vykázané učitelem od automatického orientačního odhadu.
- Zpevněny integrační adaptéry: validace materiálu, bezpečné ukládání, přenos návratové adresy Studia a tvorba bannerů bez innerHTML.
- Vyčištěn distribuční balík Školních aplikací od zastaralých sestavených artefaktů a doplněna kontrola proti jejich návratu.
- Aktualizována bezpečnostní, serverová a provozní dokumentace včetně sdíleného originu, GitHub synchronizace a kontinuity vlastnictví repozitářů.

## 0.5.0 — 2026-07-10

**Bezpečné exporty, lokální proškolení a rozšířená diagnostika**

- Opraveny anonymní exporty: neexportují obsah pracovního prostoru, prompty, texty materiálů, názvy materiálů ani volné poznámky.
- Doplněn lokální demonstrační režim proškolení pro serverless verzi včetně zámků aplikací a jasného upozornění, že skutečné vynucení musí řešit server.
- Na telefonu zůstává dostupný přepínač jazyka CZ/EN.
- Rozšířena Kontrola Studia o bezpečnost exportů, model oprávnění, service worker, jazykový přepínač a lokální pilotní data.
- Připraven model Top 4 aplikací: při růstu portálu zůstanou kolem jádra čtyři prioritní aplikace, ostatní budou v katalogu a uživatel si je může připnout.
- Sjednoceno zápatí podle dohodnuté formulace Autor a vývojový garant / Školní projekt.

## 0.4.0 — 2026-07-10

**Profesionální audit, diagnostika a serverová připravenost**

- Přidána samostatná stránka Změny s přehledným changelogem přímo v aplikaci.
- Přidána stránka Kontrola Studia pro rychlý test registru, ikon, lokálního úložiště, handoffu, PWA a statistických dat.
- Doplněn konfigurační model proškolení a budoucích serverových oprávnění pro jednotlivé aplikace.
- Rozšířena domovská stránka o schéma růstu brány při přibývání dalších aplikací.
- Sjednoceno zápatí: vlastník, správce, verze, changelog a kontrola Studia jsou dostupné na všech stránkách.
- Rozšířeny automatické testy o kontrolu nových stránek, zápatí, PWA cache, oprávnění a duplicitních JavaScriptových polí.

## 0.3.0 — 2026-07-10

**Serverless pracovní tok a pilotní měření**

- Přidán společný formát GHRAB Material a krátkodobý handoff do dílčích aplikací.
- Přidán pilotní dashboard, anonymní report, knihovna a centrum bezpečnosti.
- Doplněna automatizovaná synchronizace manifestů aplikací.

## 0.2.1 — 2026-07-10

**Výkon, animace a celá obrazovka**

- Doplněny režimy animací: automatické, plné, úsporné a vypnuté.
- Doplněno tlačítko celé obrazovky a úspornější mobilní režim.

## 0.2.0 — 2026-07-10

**Portál a automatizace**

- Přidán sci-fi portál, automatizace a manifesty dílčích aplikací.

## 0.1.0 — 2026-07-10

**První serverless portál**

- Vznikl první společný rozcestník aplikací s PWA jádrem.
