# Changelog

> Tento soubor se generuje ze `src/config/changelog.json`. Neupravujte jej ručně.

## 0.20.16 — 2026-08-09
**Mobilní nastavení: obnovení přepínače CZ/EN**

- Opraven konflikt responzivních CSS pravidel, který na displejích do 650 px po otevření Nastavení skryl přepínač CZ/EN, přestože samotný panel nastavení zůstal viditelný.
- Kritický browser flow zůstává beze změny a nyní funguje jako regresní ochrana skutečné uživatelské cesty: otevřít menu, otevřít Nastavení, přepnout do EN a zpět do CS.
- Patch používá novou verzi 0.20.16, aby PWA cache nemohla ponechat starý mobilní CSS soubor z 0.20.15.
- Do běžného `npm test` přibyla statická regresní kontrola, která odmítne návrat mobilního pravidla skrývajícího jazykový přepínač uvnitř panelu Nastavení.

## 0.20.15 — 2026-08-09
**Odolnost ovládání: oprava nereagujících tlačítek a PWA cache**

- Build nyní přidává verzi ke všem lokálním JS/CSS vstupům i relativním modulovým importům, aby se nové HTML nikdy nespárovalo se starým JavaScriptem z předchozí PWA cache.
- Service worker při požadavku na jinou verzi obchází vlastní statickou cache; u své verze naopak zachovává offline fallback na správný přednačtený asset.
- Úvodní překryv dostal nezávislý fail-open watchdog a bezpečné uvolnění inertního stavu, takže chyba při startu už nemůže trvale zablokovat všechna tlačítka Studia.
- QA nově kontroluje verzování celého modulového grafu a browser flow skutečně kliká na navigaci, nastavení a přepínač jazyka; současně byly zpevněny okrajové handlery navigace a klávesnice.

## 0.20.14 — 2026-08-04
**Platformní P3: modularizace, výkon, přístupnost a provozní důkazy**

- GHRAB Platform 1.1.0 zavádí společné kontrakty přístupnosti, výkonových rozpočtů a lazy modulů.
- Registry a volitelné portálové efekty byly odděleny do samostatných modulů bez změny pracovního prostoru Studia.
- Všech devět projektů má jednotnou statickou, klávesnicovou a CI axe bránu a měřený výkonový rozpočet.
- Registry satelitů, AI readiness a certifikační důkazy odpovídají přesným verzím P3.
- P3 uzavírá safe distribuci LUDUS médií a kapacitní baseline Lesson Hubu.

## 0.20.9 — 2026-08-04
**Platformní P1: školní relace, AI Gateway a jednotná datová ochrana**

- Školní profil používá serverem řízenou relaci s HttpOnly/Secure/SameSite cookie a krátkodobým request tokenem pouze v paměti; GitHub Pages nadále zachovávají podepsaný serverless přístup.
- GHRAB AI Core 1.0.0 je certifikován v šesti AI aplikacích. Společný registr obsahuje 31 pojmenovaných operací a školní gateway autoritativně eviduje provider requesty, tokeny, limity, náklady a vícefázová workflow.
- Provider API klíče se ve školním profilu nikdy neposílají ani neukládají v prohlížeči. Přímý Gemini režim zůstává dostupný jen v GitHub profilu a staré trvalé klíče jsou migrovány do dočasné relace nebo odstraněny.
- Devět aplikací sdílí deployment, CSP, datové a privacy kontrakty, společný health/version handshake, bezpečnou diagnostiku bez obsahu a ovládání pro sdílené školní zařízení.
- Lesson Hub je napojen přes centrální reverzní proxy bez bearer tokenu v úložišti prohlížeče. Registr Studia je synchronizován s KS 5.9.14, SORTIO 1.0.6, Lesson Hub 1.2.3, Diferenciátor 1.3.7, ACTIVA 0.5.4, Hodnotitel 1.5.5, LUDUS 1.16.6 a Generátor 7.1.7.

## 0.20.8 — 2026-08-04
**Platformní P0: odolný start a server-ready základ**

- Centrální Access Guard už nemá statickou závislost na reportéru. Portál, satelitní aplikace i zamykací obrazovka načítají diagnostiku best-effort a výpadek reportéru nesmí zablokovat aplikaci ani být vydáván za chybu oprávnění.
- Zaveden společný deployment kontrakt pro současné GitHub Pages a P0 kompatibilní hosting na školním serveru. Profil neobsahuje tajné údaje a poctivě ponechává serverovou relaci a AI gateway do etapy P1.
- Service workery a nouzové čištění cache chrání čerstvost sdílené přístupové vrstvy včetně policy, revokací, veřejného klíče a deployment konfigurace; identifikátor čištění se řídí verzí společné vrstvy.
- Kanonický reportér 1.1.0 omezuje skutečnou zakódovanou Gmail/mailto adresu, zachovává plné údaje v ZIPu a kopírování, uzavírá fokus v dialogu, obnovuje fokus a přiděluje nové ID každému novému hlášení.
- Registr Studia byl synchronizován s verzemi KS 5.9.13, SORTIO 1.0.5, Lesson Hub 1.2.2, Diferenciátor 1.3.6, ACTIVA 0.5.3, Hodnotitel 1.5.4, LUDUS 1.16.5 a Generátor 7.1.6.

## 0.20.7 — 2026-08-03
**Jednotný reportér chyb v celém ekosystému**

- AI Studio a osm samostatných aplikací používají jeden synchronizovaný základ reportéru s ochranou identifikátorem ghrab-error-reporter; lokální aplikace výslovně vypínají centrální instanci v app-guard.js.
- Reportér živě sleduje skutečný světlý nebo tmavý motiv aplikace, nabízí výhradně explicitní přechod do aplikace a podporuje až pět snímků přes responzivní plovoucí panel.
- Křížek, Zavřít, kliknutí mimo dialog i Escape používají stejnou ochranu konceptu; úplné smazání odstraní text, snímky, ZIP, technické chyby, původní ID i aktivní stream.
- Hlavní akce je skutečný předem připravený Gmail odkaz a současné stažení soukromí respektujícího ZIPu; aktualizován byl také společný návod a záložní e-mailové akce.
- Registr Studia byl synchronizován s verzemi KS 5.9.12, SORTIO 1.0.4, Lesson Hub 1.2.1, Diferenciátor 1.3.5, ACTIVA 0.5.2, Hodnotitel 1.5.3, LUDUS 1.16.4 a Generátor 7.1.5.

## 0.20.6 — 2026-08-03
**Odolná QA kontrola reporteru a předem připravený Gmail odkaz**

- Úplná Gmail adresa včetně příjemce je v nativním odkazu připravena ještě před kliknutím; kliknutí již adresu na poslední chvíli nepřepisuje.
- Chromium test ověřuje správný Gmail odkaz a vznik nové karty odděleně, takže není závislý na přesměrování, přihlášení ani dostupnosti služby Google.
- Kontrola návodu normalizuje HTML mezery a formátování, takže Prettier nemůže způsobit falešný pád release gate.

## 0.20.5 — 2026-08-03
**Definitivní otevření Gmailu bez blokovaného popupu**

- Hlavní akce reportéru je nativní odkaz do nové karty; nepoužívá window.open, které mohl Chrome v PWA nebo chráněném kontextu zablokovat.
- Kliknutí otevře předvyplněný Gmail a na původní kartě současně vytvoří a stáhne diagnostický ZIP. Záložní odkazy na Gmail, poštovní aplikaci a kopírování údajů zůstávají.
- Nespolehlivá volba přímého sdílení ZIP byla odstraněna a nový Chromium test skutečným kliknutím ověřuje vznik karty Gmailu s adresou správce.

## 0.20.4 — 2026-08-03
**Spolehlivé hlášení chyby a aktuální návod**

- Centrální reportér nabízí plovoucí ovládání snímání vpravo dole a při zavření rozepsaného hlášení se zeptá, zda koncept smazat, ponechat, nebo se vrátit.
- Předvyplněný Gmail se otevře přímo v nové kartě v okamžiku kliknutí; ZIP se následně připraví a stáhne na původní kartě. Dostupné jsou i záložní odkazy na Gmail, poštovní aplikaci a kopírování údajů.
- Volba Sdílet ZIP přes nabídku zařízení se zobrazuje až pro hotový soubor na podporovaném mobilu či tabletu. Aktualizovaný návod vysvětluje celý postup i bezpečné smazání konceptu.

## 0.20.3 — 2026-08-03
**Readiness bez vazby na pevnou verzi aplikace**

- Release gate už neurčuje živý stav KS podle natvrdo zadané verze 5.9.1; porovnává aktuální manifest, aktivní Core, konformitu a HTTPS registr operací.
- Readiness řádky, souhrnné počty a registr spotřebitelů se ověřují datově pro všech osm aplikací, takže běžný patch release znovu nezpůsobí falešný pád.
- KS 5.9.3 byl znovu certifikován: 135/135 interních testů, 17/17 Core conformance testů, Core 1.0.0 a osm veřejných AI operací.
- Doplněn verzovaný certifikační důkaz a regresní sonda, která výslovně ověřuje, že novější živá verze může zůstat ready bez změny kontraktu.
- GHRAB AI Core 1.0.0, Migration Kit 1.0.2, runtime direct-gemini a funkce Studia se nemění.

## 0.20.2 — 2026-08-03
**Stavově odolná synchronizace nasazených aplikací**

- Regresní test již podporuje oba pravdivé stavy aplikace: certifikováno před nasazením i živě nasazeno.
- Souhrn readiness se kontroluje proti skutečným stavům všech aplikací, nikoli proti jedné natvrdo zadané přechodové hodnotě.
- KS 5.9.1 může po živé synchronizaci přejít do stavu ready bez falešného pádu release gate.
- GHRAB AI Core 1.0.0, Migration Kit 1.0.2, runtime direct-gemini a funkce Studia zůstávají beze změny.

## 0.20.1 — 2026-08-03
**Ochrana neměnných artefaktů GHRAB AI Core**

- Prettier již nikdy neupravuje vydané soubory v src/ai-core/releases; jejich bajtová podoba a SHA-256 zůstávají zachované.
- Lokální formátování i GitHub Actions ověřují integritu Core před formátováním a workflow ji znovu kontroluje bezprostředně po něm.
- Projektové testy hlídají .prettierignore, pořadí kontrol ve workflow a ochranné příkazy v package.json, aby se chyba nemohla vrátit.
- Funkce Studia, GHRAB AI Core 1.0.0, Migration Kit 1.0.2 a výchozí direct-gemini provoz se nemění.

## 0.20.0 — 2026-08-02
**Centrální správa GHRAB AI Core**

- AI Studio vydává a ověřuje neměnný GHRAB AI Core 1.0.0 včetně manifestu, kontraktu, konformitní sady a SHA-256.
- Správcovské centrum zobrazuje aktivní Core, runtime režim a pravdivý stav migrace všech osmi aplikací.
- KS 5.9.1 je evidován jako lokálně certifikovaná referenční integrace čekající na skutečné nasazení živého manifestu.
- Výchozí provoz zůstává direct-gemini bez automatického fallbacku; School Gateway se nezapíná.
- Připraven je bezpečný repository_dispatch workflow a Migration Kit 1.0.2 pro další aplikace.

## 0.19.0 — 2026-08-02
**Lesson Hub jako osmá aplikace ekosystému**

- Lesson Hub 1.2.0 byl přidán do živého registru, offline fallbacku, přístupové politiky a synchronizace se školením LHB-01.
- Centrum manuálů otevírá aktuální příručku přímo z repozitáře Lesson Hubu a katalog popisuje kontinuitu skupin, výuku, materiály, zálohy, komunikaci a zastupování.
- Pilotní telemetrie a report přijímají pouze schválené technické počty bez názvů hodin, poznámek, materiálů nebo studentských údajů.
- QA kontroly, bezpečnostní rámec a dokumentace nyní ověřují osm chráněných aplikací.

## 0.18.11 — 2026-07-27
**Více prostoru pod hlavní bránou**

- Panel „Správcovský přístup aktivní“ byl posunut níže, aby jeho horní rohy opticky nezasahovaly do spodních karet LUDUS a Generátoru interaktivních testů.
- Na úzkých obrazovkách zůstává zachovaný menší, ale zřetelný odstup bez zbytečného prodlužování stránky.
- Registry aplikací, přístupová logika a obsah brány se nemění.

## 0.18.10 — 2026-07-27
**Korespondenční asistent 5.5.5 v registru Studia**

- Živý i offline registr byly sjednoceny s Korespondenčním asistentem 5.5.5.
- Centrum manuálů nově upozorňuje také na kapitolu Bezpečná práce s údaji a finální kontrolu.
- Dokumentace nasazení, integrace a bezpečnostního rámce byla aktualizována na aktuální verze.

## 0.18.9 — 2026-07-27
**Přehlednější workflow Korespondenčního asistenta**

- Registr a offline fallback byly aktualizovány na Korespondenčního asistenta 5.5.2.
- Centrum manuálů nyní popisuje dvě hlavní cesty, školní situaci uvnitř sestavení e-mailu, profil nad konceptem a kontextové nápovědy.
- Samotný manuál se nadále načítá přímo z repozitáře Korespondenčního asistenta.

## 0.18.8 — 2026-07-27
**Aktuální manuál Korespondenčního asistenta**

- Centrální registr a jeho offline fallback byly aktualizovány na Korespondenčního asistenta 5.5.1 včetně kompatibility se Studio Bridge 1.3.
- Centrum manuálů nyní výslovně uvádí pracovní profil, rychlé rozpoznání nastavení, školní scénáře, tón a délku i hromadné adresáty.
- AI Studio nadále načítá samotný interaktivní manuál z repozitáře aplikace, takže po nasazení Korespondenčního asistenta zobrazuje jeho aktuální obsah bez duplicitní kopie.

## 0.18.7 — 2026-07-26
**Optické vycentrování hlavní brány**

- Hlavní hvězdná brána je na desktopu jemně posunuta doleva podle skutečného rozdílu mezer mezi její viditelnou obrubou a levým i pravým sloupcem aplikací.
- Korekce se vztahuje na celý kompozit brány včetně kruhů, záře, plošiny a stavového štítku; mobilní jednosloupcové rozložení zůstává přesně geometricky vystředěné.

## 0.18.6 — 2026-07-26
**Samostatné repozitáře Diferenciátoru a Korespondenčního asistenta**

- Diferenciátor 1.3.3 a Korespondenční asistent 5.2.5 se nyní načítají z vlastních samostatných repozitářů a nových adres GitHub Pages.
- Centrální registr, ověřený fallback, odkazy na interaktivní manuály a informace o zdrojových repozitářích byly sjednoceny s novou strukturou.
- Dokumentace nasazení a bezpečnostní přehled byly aktualizovány pro oddělené aplikace; přístupová brána, telemetrie a společný origin zůstávají zachovány.

## 0.18.5 — 2026-07-25
**Audit telemetrie, přístupu a offline provozu**

- ACTIVA a SORTIO nyní mají povolené typy pilotních výstupů a report zobrazuje všech sedm aplikací.
- Správcovské stránky čtou jediný seznam z přístupové politiky; Pilot je chráněn stejně jako ostatní administrátorské části.
- Byla zpřísněna synchronizace manifestů, opraven offline návrat na podstránky a zmenšena precache; plná prémiová animace hvězdné brány zůstává zachována.
- Nový projektový QA validátor hlídá registry, telemetrii, správcovské stránky, verze, formáty obrázků a rozpočet precache.

## 0.18.4 — 2026-07-23
**SORTIO jako sedmá aplikace AI Studia**

- Do registru aplikací, přístupové politiky a synchronizace bylo přidáno SORTIO 1.0.2 s povinným školením SOR-01.
- Centrum manuálů nyní nabízí průvodce importem tříd, losováním, chytrými skupinami, rolemi, zasedacím pořádkem, projekcí a zálohami SORTIO.
- Integrační a QA kontroly ověřují sedm aplikací, zdroj SORTIO, ikonu, manuál, školení a kompatibilitu se Studio Bridge 1.1.

## 0.18.3 — 2026-07-22
**ACTIVA, rozšířené manuály a šestá aplikace ekosystému**

- Do aktuálního registru, přístupové politiky, synchronizace a pracovního prostoru byla přidána ACTIVA 0.5.0 s povinným školením ACT-01.
- Centrum Manuály nově ukazuje konkrétní obsah průvodce každé aplikace a společnou provozní příručku pro API klíče, soukromí, PDF, zálohy, PWA a diagnostiku.
- Integrační a QA kontroly ověřují šest aplikací, zdroj ACTIVA, manuál, ikonu, školení a kompatibilitu s bezserverovým přístupem.

## 0.18.2 — 2026-07-17
**Správný návrat z manuálu do otevřené aplikace**

- Po otevření interaktivního manuálu z aplikace se horní návratové tlačítko změní na Zpět do aplikace a vrátí uživatele do té konkrétní aplikace, nikoli na domovskou stránku AI Studia.
- Návrat nejprve využije historii vloženého pracovního rámce, aby mohl obnovit předchozí stav aplikace; při nedostupné historii bezpečně použije její výchozí adresu.
- Horní lišta při otevřeném manuálu jasně označí režim manuálu a samostatné otevření míří na právě zobrazený manuál.

## 0.18.1 — 2026-07-17
**Čistý přechod do prémiového intra**

- Hlavní portál je skryt už při prvním vykreslení stránky, takže před úvodním intrem neproblikne brána ani prostředí Studia.
- Po dokončení nebo přeskočení intra se pracovní prostředí plynule odkryje pod jeho závěrečným přechodem.

## 0.18.0 — 2026-07-17
**Prezentační režim, interní manuály a prémiový start**

- Úvodní portál se při desktopové prezentaci a F11 automaticky přizpůsobí tak, aby název, brána a čtyři hlavní aplikace zůstaly současně viditelné.
- V prezentačním režimu se dočasně skryje instalační nabídka PWA, aby nepřekrývala pravou dolní aplikační kartu.
- Interaktivní manuály aplikací se ve vestavěném pracovním prostoru otevírají ve stejném rámci místo nové internetové karty.
- Desktopový start AI Studia dostal krátké prémiové intro s možností okamžitého přeskočení.
- Registry aplikací byly sjednoceny s opravnými verzemi Generátor 7.1.4, Diferenciátor 1.3.2, Hodnotitel 1.5.2, Korespondenční asistent 5.2.2 a LUDUS 1.16.3.

## 0.17.5 — 2026-07-17
**Hodnotitel 1.5.1 a GHRAB QA Standard 1.0.2**

- Centrální registr a fallback konfigurace byly aktualizovány na Hodnotitel maturitních slohů 1.5.1 s auditními opravami.
- Společná certifikační vrstva používá GHRAB QA 1.0.2 s kontrolou atomického PWA precache, runtime regex lookbehind a projektových bezpečnostních validátorů.
- Stav READY zůstává vázán na konkrétní build, ruční galerii a deployed smoke test; aktualizace registru sama žádnou aplikaci automaticky neschvaluje.

## 0.17.4 — 2026-07-16
**Jednotná GHRAB QA brána a izolace PWA cache**

- Přidána jednotná certifikační brána GHRAB QA 1.0.1 s technickými, bezpečnostními, PWA, kritickými a skutečnými Chromium vizuálními kontrolami.
- Service worker při aktivaci maže pouze starší cache AI Studia se stejným prefixem a nemůže odstranit offline cache ostatních aplikací na stejném původu.
- Výsledek READY je vázán na verzi a SHA-256 buildu a vyžaduje ruční kontrolu galerie i deployed smoke test.

## 0.17.3 — 2026-07-15
**Viditelná animace brány při spuštění každé aplikace**

- Při spuštění aplikace z katalogu se stránka nejprve plynule vrátí a vycentruje hlavní hvězdnou bránu.
- Mechanické otáčení prstenců začne až po dokončení přesunu, takže uživatel vždy uvidí celou dvousekundovou sekvenci.
- Stejné pořadí spuštění nyní platí pro Top 4 kolem brány i pro všechny další aplikace v katalogu; omezený pohyb a vypnuté animace zůstávají respektovány.

## 0.17.2 — 2026-07-15
**Kompaktní logo Hodnotitele v pracovním prostoru Studia**

- Při otevření Hodnotitele uvnitř AI Studia se jeho nadměrně velké logo v dolní informační části automaticky zmenší na přiměřený rozměr.
- Úprava se aplikuje pouze na Hodnotitel ve vloženém pracovním prostoru a nemění vzhled ostatních aplikací ani jejich samostatné otevření.
- Logo je rozpoznáno i po pozdějším vykreslení aplikace; úprava proto funguje také u dynamicky načítaného obsahu.

## 0.17.1 — 2026-07-15
**Aplikace se otevírají uvnitř Studia bez bílého popup okna**

- Odstraněno předčasné otevírání prázdného okna about:blank, které přebíralo pozornost a skrývalo animaci probíhající ve Studiu.
- Po kliknutí zůstane uživatel ve Studiu: nejprve dvě sekundy vidí mechanické otáčení prstenců hlavní brány, poté samostatnou animaci vybrané aplikace.
- Cílová aplikace se následně otevře v novém interním pracovním prostoru Studia pomocí vloženého rámce, nikoli v další kartě prohlížeče.
- Pracovní prostor obsahuje návrat do Studia, obnovení aplikace, celou obrazovku a pouze volitelnou možnost otevřít aplikaci samostatně.
- Automatický režim pohybu na počítači již nesnižuje animaci jen kvůli čtyřjádrovému procesoru nebo 4 GB hlášené paměti, takže dvousekundové prstence zůstávají viditelné.
- Nabídka Nainstalovat AI Studio vpravo dole zůstala zachována a byla znovu zahrnuta do regresních kontrol.

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
