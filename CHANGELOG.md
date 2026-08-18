# Changelog

> Tento soubor se generuje ze `src/config/changelog.json`. Neupravujte jej ručně.

## 0.21.28 — 2026-08-18
**Osobní stav testování aplikací**

- Plný správce má nově přímo v každé kartě aplikace tříúrovňové označení ○ netestováno, ◐ lehce otestováno a ✓ otestováno; kliknutím na symbol stav cyklicky změní.
- Stavy se ukládají místně podle stabilního ID aplikace. Funkce proto automaticky pokryje i budoucí aplikace, které začínají jako netestované, a nezobrazuje se učitelům ani v Pohledu kolegy.
- Vydavatel už každou roli Správce automaticky nezkracuje na 14 dní. Hlavní správce má samostatnou volbu maximální bezpečné platnosti 400 dní; 7/14/30 dní zůstává pro dočasné plné zastoupení.
- Souhrn přístupu nyní rozlišuje platnost bezpečnostního oprávnění správce od samotné správcovské role a nejasný „seznam odvolání“ přejmenovává na kontrolu zneplatněných přístupů. Trvalá správcovská role tím není časově omezena; expiruje pouze konkrétní přenositelné oprávnění.

## 0.21.27 — 2026-08-13
**Stabilní produkční regresní test screenshotů**

- Opraven falešný pád GitHub QA po 87 úspěšných kontrolách: test po otevření Gmailu nechával původní AI Studio na pozadí, kde Chromium výrazně omezilo nebo zmrazilo MediaStream a dekódování obrázku.
- Produkční screenshot regresní scénář nyní před reálným canvas MediaStreamem výslovně vrátí kartu AI Studia do popředí a ověří její viditelnost. Tím test odpovídá skutečnému uživatelskému scénáři pořizování snímku.
- Kontrola CSP `img-src blob:` zůstává zachována a skutečný produkční screenshot po opravě testu prochází s platným náhledem; runtime reportéru ani bezpečnostní politika se kvůli tomuto CI hotfixu nerozšiřují.

## 0.21.26 — 2026-08-13
**Hotfix skutečného ukládání screenshotů**

- Produkční Content Security Policy AI Studia nově povoluje lokální blob náhledy vytvořených screenshotů. Snímek se proto po zachycení skutečně přidá do hlášení místo chyby „Obrázek se nepodařilo zpracovat“.
- Regresní test nově otevírá skutečný produkční index AI Studia, připojí reálný canvas MediaStream a ověří, že výsledný blob obrázek projde produkční CSP a má platný náhled.
- Dvoukrokové stažení ZIPu, ruční přiložení do Gmailu, skryté pomocné video a ostatní opravy reportéru zůstávají beze změny.
- Registr AI Studia byl současně dorovnán na opravený LUDUS 1.16.13.

## 0.21.25 — 2026-08-13
**Sjednocený dvoukrokový reportér chyb**

- Centrální reportér AI Studia přebírá ověřené chování z Korespondenčního asistenta 5.10.3: nejprve vytvoří skutečný odkaz ke stažení ZIPu a Gmail zpřístupní až po kliknutí na stažení.
- Rozhraní i předvyplněný e-mail výslovně vyžadují ruční přiložení ZIPu pomocí kancelářské sponky; automatické přiložení se neslibuje.
- Pomocné video je uvnitř kořene reportéru, mimo obrazovku a skryté přes CSS i inline pojistku včetně opacity, visibility, pointer-events a aria-hidden, takže při sdílení stejné karty a scrollování nevzniká rekurzivní obraz.
- Regresní sada fyzicky kliká na stažení, ověřuje ZIP ve složce Stažené soubory, jeho diagnostiku a snímky, následné odemčení Gmailu, jednu instanci reportéru, motivy, mobilní zobrazení a klávesnici.
- Registr aplikací AI Studia byl aktualizován na vydání se sjednoceným reportérem; Korespondenční asistent zůstává beze změny ve verzi 5.10.3.

## 0.21.24 — 2026-08-13
**Reportér 0.21.24: spolehlivé pořizování screenshotů**

- Inicializace snímání už nečeká bez omezení na událost loadedmetadata. Reportér nyní ověřuje skutečně dostupný obrazový frame s časovým limitem, takže se po udělení oprávnění nezasekne ve stavu, kdy tlačítko Pořídit snímek nereaguje.
- Pořízení snímku má nově jasnou průběžnou odezvu: Pořizuji snímek… a po úspěchu Snímek uložen ✓. Neaktivní nebo ukončený stream už nekončí tichým návratem bez vysvětlení.
- Skrytý video prvek používaný pro screen capture je správně stylován i mimo kořen reportéru, takže se nemůže nechtěně zobrazit v aplikaci nebo dostat do vlastního náhledu snímání.
- Regresní test nově simuluje opožděné zpřístupnění rozměrů videa bez nové události loadedmetadata a kontroluje pořízení snímku jak přímo v hlášení, tak z plovoucího panelu.

## 0.21.23 — 2026-08-12
**Showroom 0.21.23: plynulý prolog a souvislý zvuk**

- Vadný černý snímek v čase 00:04,67 byl nahrazen vypočteným mezisnímkem ze sousedních záběrů. Hvězdná brána proto už krátce nezhasne a přechod k titulku „AI mění svět.“ zůstává plynulý.
- Zvuková stopa byla znovu sestavena z původního zdrojového souboru jako jediný nepřerušený průběh. Tím zmizel přibližně 29ms přeskočený úsek kolem 00:30,57 i návrat hudby o přibližně 205 ms kolem 01:01,28.
- Finální zvuk používá 48 kHz stereo AAC-LC s tokem přibližně 320 kb/s, integrovanou hlasitostí −17,0 LUFS, true peakem −6,2 dBFS a plynulým závěrečným ztišením.
- Obraz zůstává 2560×1440 / 30 fps a stopáž 91,7 sekundy. Master je exportován jako kvalitní H.264 s rychlým startem pro webové přehrávání; ostatní části Studia se nemění.

## 0.21.22 — 2026-08-12
**Showroom 0.21.22: čistý přechod a dokončený LUDUS úvod**

- Přechod kolem 00:05–00:06 byl přestřižen bez tmavého mezikroku: hvězdná brána nyní plynule přechází přímo do titulku „AI mění svět.“.
- Úvod LUDUSu používá skutečný tmavý vzhled aplikace otevřené uvnitř AI Studia podle aktuálního rozhraní, místo světlého QA záběru.
- Hogwarts Grammar Academy už nepůsobí prázdně: v hero záběru je viditelná skutečná úvodní karta s příběhovým textem, polem pro jméno a tlačítkem Begin Your Journey, která se v enginu standardně odhaluje se zpožděním.
- Showroom zůstává v 2560×1440 / 30 fps a zvuková stopa zůstává beze změny. Opravované úseky byly nahrazeny cíleně a master je exportován ve vysoké kvalitě H.264.

## 0.21.21 — 2026-08-12
**Showroom 0.21.21: věrný LUDUS a vyšší projekční kvalita**

- Úvodní záběr LUDUSu byl znovu vytvořen podle aktuálního zdroje aplikace 1.16.11. Zobrazuje skutečný hero text „Postav hru, aniž bys psal kód.“, tříkrokový postup Mechanika – Svět – Obsah a reálný první krok „Vyber mechaniku“ místo dřívější zjednodušené rekonstrukce.
- LUDUS úsek byl nahrazen samostatně podle aktuálního zdroje a výsledný master prošel jediným finálním 1440p průchodem s Lanczos škálováním a mírným doostřením, bez řetězení dalších meziverzí.
- Samostatný showroom i vložený film jsou exportovány ve 2560×1440 / 30 fps. Obrazový tok je přibližně 4,46 Mb/s, soubor má přibližně 53,5 MB a zůstává pod 60MB release limitem. Stopáž je přibližně 91,7 sekundy a nepřerušovaný soundtrack zůstává beze změny.

## 0.21.20 — 2026-08-12
**Showroom 0.21.20: čitelnější úvod, celé ikony a čistý LUDUS**

- Ideový úvod byl prodloužen z přibližně 15 na 21 sekund. Tři hlavní textové karty mají samostatný delší čas pro čtení a aplikace začínají až po dokončení úvodní argumentace.
- Levý informační sloupec všech osmi aplikací byl znovu vysázen z čistých zdrojů. Ikony jsou celé, názvy nepřetékají do ukázky a u Hodnotitele nezůstává žádný zbytek původního textu.
- LUDUS nově začíná čistou úvodní stránkou bez modalu „Vítej v LUDUS“. Hogwarts Grammar Academy a Indiana Jones se zobrazují bez duplicitních redakčních nadpisů; závěr byl sestaven bez starého problikávajícího rámečku.

## 0.21.19 — 2026-08-12
**Prémiové doladění showroomu: bezpečné rozestupy, čistý Diferenciátor a nové finále**

- Všechny aplikační karty dostaly pevnou levou bezpečnou zónu. Popisy už nezasahují do ukázek a kompaktní demo štítek byl zkrácen na „DEMO · 1.A · ANGLIČTINA“, takže se nedotýká rámečku aplikace.
- Diferenciátor má opravený celý název aplikace v náhledu a nově vysázený panel tří pedagogických verzí; text „jiná podpora“ zůstává uvnitř jednotlivých karet a nic není oříznuté.
- Závěrečná teze byla kompletně překreslena na čistou středovou kompozici bez rušivého vnitřního rámečku. Video je znovu vyrenderováno z kvalitnějšího 6,6Mb/s masteru, 1920×1080 / 30 fps, přičemž původní nepřerušovaný soundtrack zůstává beze změny.

## 0.21.18 — 2026-08-11
**Stabilizovaný Premium Master: klidné UI, plynulé přechody a vyšší obrazová kvalita**

- Showroom byl stabilizován pro projekci v učebně: v aplikačních sekvencích bylo odstraněno průběžné mikroposouvání, vlnění a plovoucí karty. Rozhraní po nástupu zůstává klidné; dynamiku tvoří především střih, jemné prolnutí a velmi pomalý filmový push-in.
- LUDUS zůstává dynamický, ale jednotlivé herní světy jsou nyní stabilní hero záběry propojené krátkými prolnutími. Hogwarts Grammar Academy, The Frostline Express, Matrix a Indiana Jones se proto dají pohodlně přečíst bez dojmu ruční kamery.
- Nový master je 1920×1080 / 30 fps s obrazovým tokem přibližně 6,6 Mb/s a je sestaven z ostrých zdrojových kompozic. Zvuk zůstává plynulý bez remixu; naměřená integrovaná hlasitost je přibližně -16,8 LUFS a true peak -5,7 dBFS.

## 0.21.17 — 2026-08-11
**Premium Master showroomu: ostrý obraz, hotové výstupy a čisté finále**

- Showroom byl znovu sestaven z čistých zdrojových screenshotů a nově vyrenderovaných prezentačních vrstev místo dalšího přepočtu remasteru. Výstup je Full HD 1920×1080 / 30 fps a drobný text i aplikační panely jsou výrazně ostřejší na notebooku i projektoru.
- Přehlídka osmi aplikací nyní používá jednotnou anonymní demo situaci 1.A · angličtina · Present Perfect a ukazuje hotový výsledek práce: test, tři diferenciované verze, hodnocení slohu, anonymizovanou odpověď, herní světy LUDUSu, pracovní list, obsazený zasedací pořádek a naplánovanou hodinu. Prázdné a chybové stavy už nejsou hlavní vizitkou aplikací.
- Uživatelem dodaná skladba běží plynule od začátku bez remixu a vnitřních střihů; výsledná hlasitost je přibližně −16 LUFS. Karta „Ne ukázka budoucnosti. Nástroje, které už máme.“ se objeví právě jednou a plynule zhasne do závěrečné teze. Finále obsahuje pouze nenápadný odkaz ghrabuvka.cz, bez směrování návštěvníků na chodbu nebo na všechny učitele.

## 0.21.16 — 2026-08-11
**Showroom bez překryvů, plynulá skladba a klidnější finále**

- Ideový prolog showroomu byl přestříhán tak, aby se jednotlivé titulky nikdy nepřekrývaly. Každá hlavní myšlenka má vlastní čitelný časový úsek a mezi kartami je krátký filmový nádech do tmy.
- Uživatelem dodaná skladba nyní běží od začátku plynule v původním pořadí bez remixu, beatových přeskládání nebo střihů; upravena je pouze výsledná hlasitost a závěrečné ztišení.
- Závěrečná karta „Ne ukázka budoucnosti. Nástroje, které už máme.“ zůstává na obrazovce déle a přechod k tezi o budoucnosti AI probíhá přes plynulé stmavení místo rychlého bliknutí. Film má přibližně 87 sekund.

## 0.21.15 — 2026-08-11
**Showroom dostává ideový prolog a finální tezi o AI gramotnosti**

- Showroom film nově po aktivaci hvězdné brány vysvětluje, proč škola AI bezmyšlenkovitě nezakazuje: odpovědí je vzdělávání a schopnost AI použít, ověřit, chápat její limity a samostatně rozhodnout.
- Ideový prolog vrcholí větou „Ne osm aplikací. Jeden školní ekosystém.“ a teprve potom přechází do přehlídky skutečných aplikací, takže video nejdřív vysvětlí smysl projektu a až potom jeho nástroje.
- Závěr filmu nově uzavírá hlavní vize: budoucnost nebude patřit těm, kteří AI jen používají, ale těm, kteří vědí, jak ji používat dobře. Stopáž je přibližně 83 sekund a soundtrack zůstává postavený na uživatelem dodané skladbě ve vlastním trailerovém střihu.

## 0.21.14 — 2026-08-11
**Ideový prolog Prezentace o odpovědné práci s AI**

- Prezentace dostala novou kapitolu „Proč AI Studio?“, která projekt zasazuje do širší školní strategie: AI nezakazovat bezmyšlenkovitě, ale učit studenty s ní pracovat efektivně, kriticky, bezpečně a s odpovědností.
- Živá fullscreen smyčka nyní začíná ideovými scénami o AI gramotnosti, ověřování výsledků, ochraně dat a lidském úsudku, než přejde k přehlídce osmi aplikací.
- Do prezentační stránky byla přidána jasná hlavní věta pro veřejné vysvětlení projektu: „Budoucnost nebude patřit těm, kteří AI jen používají. Bude patřit těm, kteří vědí, jak ji používat dobře.“

## 0.21.13 — 2026-08-11
**Trailerový střih showroomu s novým soundtrackem a čitelnějším LUDUSem**

- Showroom používá uživatelem dodanou skladbu DJ Shadow – Six Days / Tokyo Drift ve zkráceném trailerovém střihu: vybrané části jsou beatově propojené, lehce ekvalizované a hlasitostně sjednocené pro projekci.
- Sekvence LUDUS je záměrně téměř dvojnásobně zpomalená. Hogwarts Grammar Academy zůstává na obrazovce dost dlouho na přečtení a The Frostline Express dostává delší samostatný hero záběr, aniž by se ztratila filmová dynamika.
- Celková stopáž filmu se prodlužuje přibližně na 70 sekund; ostatní sekvence a funkce Studia zůstávají beze změny.

## 0.21.12 — 2026-08-11
**Akční showroom s portálem a prémiovou sekvencí LUDUS**

- Showcase film otevírá skutečná hvězdná brána AI Studia: její tři prstence se nezávisle otáčejí, osm ikon aplikací obíhá kolem portálu a závěr úvodu přechází do rychlého warp efektu.
- Sekvence LUDUS je výrazně dynamičtější: krátká přehlídka herních světů přechází do čitelného hero záběru Hogwarts Grammar Academy a následně do výraznějšího detailu skutečné scény The Frostline Express z QA rozhraní.
- Přechody filmu dostaly výraznější světelné impulzy, rychlejší kamerové nájezdy, orbitální pohyb, částice a filmové akcenty. Dodaný soundtrack Tight Corners zůstává zachovaný a synchronizovaný s původní minutovou stopáží.

## 0.21.11 — 2026-08-11
**Nový showroom, bezpečnější fullscreen a intuitivnější přístupy**

- Fullscreen Prezentace má nově větší bezpečnou zónu kolem centrálního textu, kompaktnější typografii a orbit omezený šířkou i výškou viewportu, takže text už nezasahuje do ikon aplikací.
- Showcase film byl kompletně přepracován do moderní přibližně minutové prezentace s pohybem, přechody a reálnými obrazovkami aplikací z QA podkladů; u aplikací bez čerstvého screenshotového artefaktu je obrazovka sestavena věrně podle aktuálního zdrojového rozhraní. Film používá dodaný soundtrack Tight Corners.
- Zaškrtnutí „Všechny současné i budoucí aplikace“ ve Vydavateli přístupu automaticky označí všechny aplikace, které jsou právě ve Studiu. Odškrtnutí hlavní volby ponechá jednotlivé současné výběry, takže lze snadno přejít z budoucího wildcard přístupu na explicitní současný seznam.

## 0.21.10 — 2026-08-11
**Doladění výměny přístupů a oddělení prezentačních smyček**

- Vydavatel přístupu má trvale viditelné tlačítko zpět do Evidence přístupů a po úspěšném vydání výraznou akci „Hotovo → zpět do evidence“. Při vydání náhrady ze stávajícího záznamu se původní přístup označí jako nahrazený novým JTI, ale automaticky se nezneplatní.
- Tlačítko „Odstranit z evidence“ je přejmenováno na „Odstranit jen místní záznam“, aby bylo zřejmé, že tím nedojde ke zneplatnění přístupu.
- Horní tlačítko nekonečné smyčky v Prezentaci nyní vždy cyklí živou showcase scénu s osmi aplikacemi a jejich stručnými popisy; hlavní film se už nahoře automaticky nespouští.
- Hlavní showcase film má ve své vlastní kartě samostatné tlačítko pro jednorázové přehrání se zvukem a samostatné tlačítko „Pustit film jako smyčku“.

## 0.21.9 — 2026-08-11
**Hotfix synchronizace dokumentace po živém registru**

- GitHub Actions 0.21.8 ověřily všech osm zdrojových repozitářů a bezpečnostní, technické, PWA, kombinatorické, vizuální i kritické brány prošly. Release zastavil pouze project test, protože živá synchronizace aktualizovala verze aplikací v registru, ale dokumentace zůstala na balíčkovém snapshotu.
- Příkaz npm run sync nyní po registru a AI readiness automaticky spustí synchronizaci dokumentačních verzí. Stejné pravidlo platí pro sync:offline, takže každý způsob obnovy registru udržuje šest kontrolovaných dokumentů ve shodě.
- Kontrolní brána qa:doc-versions zůstává přísná; nebyla vypnuta ani oslabena. Přidána regresní pojistka, že oba synchronizační příkazy musí volat sync-doc-app-versions.mjs.

## 0.21.8 — 2026-08-11
**Hotfix ověření zdrojového registru**

- GitHub Actions v 0.21.7 skutečně ověřily všech osm veřejných zdrojových repozitářů, ale synchronizace při nedostupném Pages manifestu ponechávala v generovaném registru starší snapshot. Bezpečnostní brána to správně zastavila jako REGISTRY_FALLBACK_UNCONFIRMED.
- Při úspěšném ověření veřejného GitHub zdroje se nyní do apps.generated.json použije právě ověřený manifest a jeho aktuální verze; lokální ikona portálu se zachová.
- Bezpečnostní validátor připouští identický generated/fallback registr jen tehdy, když je potvrzen offline snapshot, nebo když všech osm zdrojů bylo výslovně ověřeno a verze generated, reportu a zdroje se přesně shodují.
- Doplněna regresní kontrola, která brání návratu chyby, kdy repository verification ověřila novější zdroj, ale generovaný registr ponechal starší snapshot.

## 0.21.7 — 2026-08-11
**Provozní doladění Studia a opravy Prezentace**

- Patička zůstává samostatným blokem, ale používá vlastní modrý Studio gradient místo téměř černého pozadí.
- Bezpečnostní semafor má deset praktických školních kategorií. Při více volbách rozhoduje nejvyšší riziko a bezpečná anonymní volba je výlučná s rizikovými položkami.
- Kontrola zdrojů rozlišuje přímo ověřený nasazený manifest, ověřený veřejný GitHub zdroj a záložní snapshot. Offline QA už skutečný stav synchronizace nepřepisuje.
- Souhrnný report vysvětluje automatické přidání místních dat aktuálního prohlížeče/profilu; existující proškolený učitel lze povýšit na Zástupce správce bez automatického rozšíření přístupu k aplikacím.
- Karty aplikací sjednocují historické pilotní formulace na jeden Studio-level popisek „Připraveno k řízenému pilotu“ bez změny oprávnění nebo zdrojových metadat.
- Fullscreen Prezentace omezuje orbit aplikací i podle výšky viewportu a showcase MP4 má opravené Range/206 načítání mimo PWA cache plus explicitní tlačítko přehrání se zvukem.

## 0.21.6 — 2026-08-10
**Zástupce správce a provozní zastupitelnost**

- Přibyla samostatná role Zástupce správce pro dlouhodobější nepřítomnost hlavního správce. Má Správu, diagnostiku, Pilot, souhrnný report, Evidenci přístupů a Pohled kolegy, ale ne Vydavatele oprávnění, Prezentaci ani správu podpisových klíčů.
- Vydavatel oprávnění umí vytvořit roli Zástupce správce a při plném správci nabízí bezpečné rychlé expirace 7, 14 nebo 30 dní pro mimořádné dočasné zastoupení.
- Zástupce nemůže obnovovat přístupy přes Vydavatele ani se sám povýšit. Přímé správcovské stránky používají stránková oprávnění a plný administrátor zůstává jedinou rolí pro citlivé zásahy.
- Centrum Manuálů obsahuje nový krizový a provozní manuál Zástupce správce s triáží výpadků, fallbacku manifestů, problémů s přístupy, GitHub Actions a jasnými eskalačními hranicemi.
- Budoucí serverová architektura nově počítá se samostatnou rolí zástupce a auditovaným časově omezeným nouzovým povýšením.
- Prezentace obsahuje dvouminutový Full HD showcase film se zvukem: dynamické profily všech osmi aplikací, materiály, bezpečnost, zastupitelnost a budoucí školní server. Film lze přehrát samostatně nebo v nekonečné smyčce a velký MP4 soubor se záměrně neukládá do offline PWA precache.

## 0.21.5 — 2026-08-10
**Pohled kolegy, PR prezentace a přesnější provozní stav**

- Top 4 lze přetahováním myší nebo šipkami přeskládat mezi čtyřmi pozicemi kolem brány; rozložení se ukládá v prohlížeči.
- Patička je sjednocena bez černého rámečku a automatická platformní patička je vypnutá. Katalog změn má stabilní načítací stav, takže při otevření neproblikává samotná patička.
- Bezpečnostní rychlá kontrola má skutečný tříbarevný semafor, který se rozsvítí současně s textovým doporučením a nespoléhá jen na barvu.
- Prezentace byla přepracována na PR showcase pro projektor a dny otevřených dveří: živá animační smyčka, celoobrazovkový režim a video playlist připravený přes presentation.json.
- Správce má novou záložku Pohled kolegy. Náhled v session simuluje proškoleného učitele, skryje správcovské části a nemění skutečné podepsané oprávnění.
- Materiály přijímají Bridge v2 handoff s cílem ai-studio. Přibyl jednotný integrační kontrakt pro budoucí tlačítko Uložit do AI Studia ve všech osmi aplikacích; bez školního serveru zůstává uložení lokální.
- Kontrola zdrojů nově odděluje živě ověřené manifesty od záložního snapshotu a eviduje poslední živé ověření každé aplikace i poslední úplné ověření 8/8.

## 0.21.4 — 2026-08-10
**Hotfix XSS regresní brány**

- GitHub Actions správně zastavily 0.21.3, protože počet použití innerHTML vzrostl nad schválený bezpečnostní baseline 12 na 14. Nešlo o chybu offline režimu ani vykreslení aplikací; předchozí oprava 8/8 karet prošla.
- Knihovna Materiály už pro prázdné, načítací a chybové stavy neskládá HTML řetězce přes innerHTML. Stavy se vytvářejí DOM API a text se zapisuje přes textContent.
- Počet evidovaných innerHTML sinků klesl z 14 na 8 a XSS baseline byl zpřísněn na 8, aby jejich opětovné přidání znovu zastavilo release gate.

## 0.21.3 — 2026-08-10
**Hotfix zobrazení všech osmi aplikací**

- Opravena regresní chyba domovské stránky: po odstranění starého bloku mission-strip se sekce Další aplikace stále vkládala vůči tomuto již neexistujícímu prvku, takže se vykreslila pouze Top 4 a zbývající čtyři aplikace se do DOM vůbec nepřipojily.
- Sekce Další aplikace se nyní vkládá před stabilní blok value-section a má bezpečný fallback do main. Tím se znovu zobrazuje všech osm aplikací online i po offline startu; model Top 4 + další aplikace zůstává zachován.
- Přidána regresní kontrola, která zakazuje opětovnou závislost renderu dalších aplikací na odstraněném mission-strip. Browserový offline kontrakt nadále vyžaduje 8 karet online i offline.

## 0.21.2 — 2026-08-10
**Manuál AI Studia podle role**

- Centrum Manuálů má nově samostatný vstup do manuálu AI Studia. Učitel vidí praktickou verzi pro běžný provoz, administrátor rozšířenou verzi se Správou, přístupy, pilotním reportingem, prezentací a release workflow.
- Administrátorský manuál má vlastní runtime kontrolu platné role admin a jeho vstup je v centru Manuálů zobrazen pouze správci. Běžný učitel při přímém otevření dostane odkaz na svůj učitelský manuál.
- Na domovské stránce je pouze drobný role-aware odkaz „Poprvé v AI Studiu?“ pod stavem Studia. Nezabírá samostatnou kartu ani nový navigační blok a manuál zůstává kdykoli dostupný přes záložku Manuály.

## 0.21.1 — 2026-08-10
**Server-ready sdílení materiálů a jednodušší bezpečnostní kontrola**

- Záložka Materiály je znovu součástí horní navigace. V bezserverovém režimu pravdivě pracuje jen s místními ukázkami a pracovním prostorem; zároveň přímo vysvětluje budoucí sdílení v předmětových komisích.
- Přibyl server-ready material repository adapter, kontrakt API a schema sdíleného záznamu. Po skutečném připojení školního serveru může klient načíst komise, publikovat anonymizovaný materiál, vytvořit vlastní kopii a zapisovat stavy Ověřeno ve výuce / Doporučeno komisí podle serverových oprávnění.
- Sdílení se nesmí aktivovat jen přítomností UI: vyžaduje school-server profil, explicitní schoolServerConnected a sharedMaterialLibrary. Materiál označený jako obsahující osobní údaje klient odmítne publikovat.
- Rychlá kontrola dat v Bezpečnosti je nově schovaná pod volbou „Nejsem si jistý → rychle posoudit“ a stránka výslovně říká, že ji kolega nemusí používat před každým použitím AI.

## 0.21.0 — 2026-08-10
**Zjednodušené Studio a jasné role**

- Horní navigace je jediná hlavní navigace: přibyl veřejný Katalog změn a z běžného pilotu zmizely duplicitní Tvorba materiálů a Materiály; jejich technický základ zůstává zachován pro budoucí interoperabilitu.
- Domovská stránka už neduplikuje navigaci, nevyčleňuje Korespondenčního asistenta a nezobrazuje druhý správcovský rozcestník.
- Správa má jediný vstup do pilotního reportingu: Pilotní dashboard vede na souhrnný report kolegů. Odstraněny byly duplicitní karty Anonymní report, Prezentační režim a Historie změn.
- Měsíční anonymní souhrn a jeho návod jsou zobrazeny jen učitelům; správce používá import a agregaci v pilotním reportu. Katalog změn je naopak dostupný všem přihlášeným uživatelům.
- Bezpečnost byla zúžena na ochranu dat a rychlou lokální kontrolu; nesouvisející značení kvality a verzování materiálů bylo odstraněno. Společný manuál byl aktualizován pro všech osm aplikací, sdílená zařízení i plánovaný školní server.
- Patička používá modrý povrch Studia a neobsahuje duplicitní navigační odkazy.

## 0.20.21 — 2026-08-09
**Hotfix P5 quality reportu**

- P3 quality report nyní vždy zapisuje explicitní status passed/failed, který finální P5 release gate vyžaduje.
- Výpočet statusu i souhrnných počtů používá stejný seznam neúspěšných kontrol, aby se report nemohl dostat do vnitřně nekonzistentního stavu.
- Přidána regresní kontrola kontraktu quality-reportu; offline-start hotfix z 0.20.20 zůstává beze změny.

## 0.20.20 — 2026-08-09
**Hotfix offline startu registru aplikací**

- Statické registry načítané s cache: 'no-store' nyní používají přes service worker network-first s cache fallbackem, takže se po online warm-upu vykreslí karty aplikací i bez sítě.
- API, autentizační, session, health a deployment runtime požadavky zůstávají mimo service worker a nejsou touto opravou cachovány.
- Přidána statická regresní pojistka, která zakáže návrat k obcházení no-store registrů mimo offline fallback; stávající Playwright offline-start test zůstává koncovou kontrolou.

## 0.20.19 — 2026-08-09
**Auditní opravy: offline režim, release brány a school-server build**

- Přístupové runtime moduly používají network-first s cache fallbackem, takže Studio zůstává použitelné offline a online zároveň dostává čerstvou bránu.
- Release brána odmítá failed reporty bez vakuové podmínky a CI vyžaduje skutečně provedený axe audit; přibyly samokontroly, že brány umějí selhat.
- School-server build čistí precache po profilových úpravách, odvozuje P5 a feature flagy z kontraktu a odstraňuje nepoužívané serverové šablony.
- Serverová CSP je srovnána s aplikací bez unsafe-inline, přidán HSTS a automatická kontrola shody bezpečnostních hlaviček.
- Opraveno zachování volby animací, opakovaný překlad souhrnu, metadata platformy v PWA, chybějící položky changelogu a dokumentační verze aplikací.
- Vizuální QA zahrnuje 390×844, dokumentační a auditní regrese jsou automatizované a redundantní CI workflow byla omezena na jeden plný běh podle typu události.

## 0.20.18 — 2026-08-09
**Korespondenční asistent: opraven skutečný embedded bootstrap**

- Produkční reprodukce odhalila skutečnou příčinu obecné hlášky o nedostupné přístupové službě: KS 5.9.20 při startu uvnitř Studia četl `geminiModel` ještě před inicializací lexikálního bindingu a skončil TDZ výjimkou.
- Registr Studia je srovnán s opraveným KS 5.9.21 a cache `ghrab-correspondence-v5.9.21`; launch URL zůstává stejná a nevyžaduje nový přístupový token.
- Regresní ověření KS nyní před skutečným GHRAB unlockem simuluje centrální `createAiRuntimeConfig()` a vyžaduje plný `ksShellReady` + `ksAppReady` bez runtime výjimky.

## 0.20.17 — 2026-08-09
**Stabilní spouštění vložených aplikací přes AI Studio**

- Centrální app-guard nyní u chráněných satelitních aplikací před ověřením přístupu počká, až jejich lokální GHRAB Platform skutečně zpřístupní unlockProtectedScripts; tím se odstraňuje závod, který mohl v iframe zobrazit falešnou chybu „Přístup nelze ověřit“.
- Čekání je omezené časovým limitem, reaguje na ghrab:platform-ready i load/error lokálního platformního loaderu a zapisuje diagnostický stav do data-ghrab-platform-unlock-wait.
- Přidán regresní test se záměrně zpožděným načtením platformy, který potvrzuje, že přístupová brána skutečně čeká a nepokračuje s neúplným GHRAB_PLATFORM objektem.
- Registr Korespondenčního asistenta byl srovnán s aktuálně nasazenou verzí 5.9.20 a odpovídajícím názvem cache.
- Pracovní prostor před vložením satelitní aplikace aktivuje čekající novou verzi service workeru Studia a centrální přístupové moduly jsou vyřazeny ze statické PWA cache, takže ani přechod ze staré verze Studia nemůže dodat starý app-guard.
- CI stabilizace: platformní browser gate už nespouští Chromium ručně přes ladicí port, ale používá přímo připnutý Playwright. Tím se odstraňuje falešný GitHub Actions pád „Chromium debug timeout“ ještě před provedením skutečných browser kontrol.

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

## 0.20.13 — 2026-08-04
**P5: předprodukční akceptace a runtime-only předání**

- Doplněn kontrakt `ghrab-release-acceptance-v1` a předprodukční P5 brána se zachováním samostatného GitHub Pages provozu.
- Přidán runtime-only předávací režim pro školu bez zdrojových repozitářů; školní server zůstává připravený, ale nepřipojený.

## 0.20.12 — 2026-08-04
**P4: finální certifikační etapa**

- Doplněna finální certifikační etapa, lokální browserová a11y brána a požadavek na zelené `qa:p4:ci` před nasazením.
- Čistá reprodukovatelná instalace už nemá tvrdou závislost na nedostupném registru axe-core.

## 0.20.11 — 2026-08-04
**P3: GHRAB Platform 1.1.0 a výkonnostní kontrakty**

- Aktualizována GHRAB Platform na 1.1.0 a sjednoceny kontrakty přístupnosti, výkonnostních rozpočtů a lazy modulů.

## 0.20.10 — 2026-08-04
**P2: sjednocení s ekosystémem GHRAB**

- Zavedena GHRAB Platform 1.0.0, jednotná patička a motivový kontrakt, vratná migrace dat a Studio Bridge 2.0.
- PWA přešla na kanonickou cache `ghrab-ai-studio-v__APP_VERSION__` s řízenou aktualizací `GHRAB_SKIP_WAITING`.

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
