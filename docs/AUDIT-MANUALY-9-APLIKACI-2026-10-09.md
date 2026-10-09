# Průřezový audit uživatelských manuálů – 9/9 aplikací

**Datum:** 9. 10. 2026  
**Rozsah:** GIT 7.1.99; Diferenciátor 1.3.51; Hodnotitel maturitních slohů 1.5.30; Korespondenční asistent 5.10.34; LUDUS 1.16.31; ACTIVA 0.5.30; SORTIO 1.1.23; Lesson Hub 1.2.26; Maturita Desk 1.0.6; centrální katalog/prohlížeč AI Studia.  
**Referenční zdroj:** GitHub, ověřené manuálové HTML ve větvích `main` a `candidate` (shodné blob SHA pro všech devět manuálů), přidružené JS/PDF moduly na `candidate`.  
**Fyzicky ověřená PDF:** uživatelem dodaná `GHRAB-generator-manual.pdf` (8 stran), `GHRAB-sortio-manual.pdf` (3 strany), zobrazená i extrahovaná.  
**Omezení:** bez autentizované role učitele a bez nezávislého průchodu všemi živými aplikacemi; není dovoleno uvést `verified` ani tvrdit, že obsah prošel kompletní věcnou certifikací.

## Výsledek: společné závady

**P0-01 – Nečitelný PDF render.** Sdílený PDF exportér Studia vytváří Type3 bitmapové glyfy s obrácenou dekódovací maskou (`/ImageMask true /Decode [0 1]`). V reálných vzorcích GIT a SORTIO jsou písmena překrytá tmavými obdélníky; zároveň je na stránce chybná diagonální čára. Opravný draft: [Studio PR #197](https://github.com/Daniel22-dev/AI-Studio-GHRAB/pull/197). Oprava samotné masky nestačí pro kvalitu celého obsahu.

**P0-02 – Ztráta důležitého obsahu v PDF.** Funkce `htmlToBlocks()` ve [sdíleném PDF exportéru](../src/manualy/pdf-export.js) vybírá především `h1–h4,p,li,dt,dd,summary` a několik tříd. SORTIO zapisuje čtyři úvodní pracovní kroky jako `div > span > b + small`; v dodaném PDF se po nadpisu „První hodina ve čtyřech krocích“ ihned objevuje následující oddíl, bez těch čtyř kroků. ACTIVA má obdobné důležité karty (`div.card.step`). Navíc v ACTIVA je první `main` pouze fallback „Ověřuji přístup k manuálu…“, zatímco obsah je až `main#manualContent`; `doc.querySelector('main')` proto zvolí nesprávný kořen. Tato situace vyžaduje explicitně určený obsahový kořen a sémantický export karet/tabulek/poznámek – ne pouhé odstraňování vizuální vady.

**P1-03 – Duplicitní a nesourodé PDF akce.** Osm dílčích aplikací má `pdf-download.js`, který vloží do začátku `main` další tlačítko. Modul nerozlišuje iframe Studia od samostatně otevřené stránky; [viewer Studia](../src/manualy/viewer.js) má vlastní PDF akci. Ve čtyřech manuálech (GIT, Diferenciátor, Hodnotitel, KS, LUDUS – celkem pět) je navíc tlačítko „Vytisknout rychlou příručku“, kterým lze v dialogu prohlížeče též uložit PDF. GIT se liší: místní `pdf-download.js` nemá, přesto má tiskové tlačítko a centrální PDF. Výsledná nabídka je nekonzistentní a sémanticky duplicitní.

**P1-04 – Matoucí upozornění „čeká na obsahovou revizi“.** Všech osmi místních PDF modulech je nevhodná učitelská akce „Náhled PDF (čeká na obsahovou revizi)“. Sedm aplikací má současně skutečný stav `reviewStatus: 'review-required'` (Diferenciátor, Hodnotitel, KS, LUDUS, ACTIVA, Lesson Hub, Maturita Desk). GIT a SORTIO nemají ve stávajícím manuálu jednoznačný `GHRAB_MANUAL_DOC_INFO` s dokladem ověřené věcné revize. `lastReviewedAt` není důkaz akceptace. Centrální viewer pro GIT mimo standardní kontrakt umožňuje PDF podle samotné existence `GHRAB_MANUAL_EXPORT`, nikoli `verified`.

**P1-05 – Návratová navigace není odvozena od vstupu.** Katalog otevírá jednotně `viewer.html?app=…`, ale dílčí manuály mají odkazy na aplikaci pevně zapsané nebo nemají návratové odkazy. KS navíc přepisuje kliknutí na „Zpět do aplikace“ pomocí `preventDefault`, `window.close()` a `location.href='../'`; to není spolehlivé pro otevření z centra manuálů, samostatnou kartu ani iframe. Lesson Hub generuje navigaci až po dynamickém renderu; statický skript spuštěný dříve ji nemusí zachytit. Maturita Desk nabízí „Otevřít aplikaci“, i když uživatel přišel z katalogu. Cílem je pro vstup z katalogu **Manuály / AI Studio**, pro vstup z aplikace **Zpět do aplikace / AI Studio** a pro přímý odkaz bezpečný fallback **AI Studio**.

**P1-06 – Kontrast, nezávislá témata a příliš drobné texty.** V KS i Diferenciátoru jsou návratové odkazy `<a class="chipbtn manual-back">` bez explicitní `color`; běžná výchozí modrá odkazu na tmavém pozadí je obtížně čitelná. Pro prohlížečovou modrou `#0000EE` proti `#111e2c` vychází kontrast přibližně 1,79:1 (pod 4,5:1 pro běžný text). Některé navigační popisky jsou 11–13 px, u ACTIVA je označení značky 8 px. GIT, Diferenciátor, Hodnotitel, KS, LUDUS a Lesson Hub mají oba režimy (s různým způsobem přepínání); ACTIVA má jen světlý vzhled, SORTIO a Maturita Desk jen tmavý. Nezávislé téma manuálu může kontrastovat s tmavým záhlavím Studia.

**P1-07 – Konkrétní neshody věcné revize a katalogu.** GIT uvádí v horním označení „Manuál 2.0 · obsahová revize 8. 10. 2026“, ale dole „Interaktivní manuál 1.0“. [Katalog Studia](../src/manualy/manualy.js) u Maturita Desk tvrdí, že ještě neexistuje samostatná stránka `manual/`, avšak repozitář Maturita Desk již má `manual/index.html` a [registr Studia](../src/config/apps.generated.json) má `manualUrl` nastaveno přímo na ni. Lesson Hub vyhledáváním nastavuje `section.hidden`; současný PDF exportér skryté uzly ignoruje, takže tisk po filtrování může přijít o části obsahu. Obdobně hrozí selektivní ztráta v dalších manuálech s filtrováním.

## Matice aplikací

| Aplikace | Návrat z různých vstupů | PDF ovládání / úplnost | Režim a čitelnost | Věcná certifikace |
|---|---|---|---|---|
| **GIT 7.1.99** | Žádný vlastní jasný návrat do aplikace/Studia; katalog přes viewer | Tisková ikona + centrální PDF; extrakce spojuje text („Pro kohoUčitelé“, „1Zvol“); PDF fyzicky nečitelné | Světlý/tmavý, malé navigační texty | Bez formalizované `DOC_INFO`, hlavička 2.0 vs patička 1.0 |
| **Diferenciátor 1.3.51** | Pevný odkaz zpět do aplikace, i z katalogu | Místní náhled PDF + tisková ikona + centrální mechanismus | Oba režimy; riziko modrého odkazu na tmavém pozadí | `review-required` |
| **Hodnotitel 1.5.30** | Chybí vlastní jasná návratová akce | Místní PDF náhled + funkční tisková ikona + viewer | Oba režimy; drobné popisky | `review-required` v `manual.js`; plnost exportu tour ověřit |
| **Korespondenční asistent 5.10.34** | Neoprávněně nabízí „Zpět do aplikace“; listener zavírá okno/přechází do aplikace | Místní náhled PDF + tisková ikona + viewer | Oba režimy; neukotvená barva odkazu | `review-required`; verze manuálu 1.3.16 je samostatné verzování |
| **LUDUS 1.16.31** | Bez vlastního jednoznačného návratu | Místní náhled PDF + tisková ikona + viewer | Oba režimy; nutný vizuální test | `review-required` |
| **ACTIVA 0.5.30** | Pevné „Zpět do ACTIVA“, nepočítá s katalogem | Místní náhled PDF; **špatně vybraný `main`**, ztracené úvodní karty, tabulky závislé na exportních extras | Jen světlý vzhled; některé texty 8–12 px | `review-required` v `manual.js` |
| **SORTIO 1.1.23** | Pevné „Zpět do aplikace“ | Místní náhled PDF; **chybějí čtyři první kroky** v reálném PDF | Jen tmavý vzhled | `DOC_INFO`/doklad věcné certifikace chybí |
| **Lesson Hub 1.2.26** | Dynamické pevné „Zpět do aplikace“ + AI Studio bez kontextu | Místní náhled PDF; filtrování přes `hidden` může krátit export | Oba režimy; drobné popisky karet | `review-required` v `manual.js` |
| **Maturita Desk 1.0.6** | Pevné „Otevřít aplikaci“; katalog uvádí nepravdivou informaci o nepřítomném manuálu | Místní náhled PDF; soulad samostatného pilotního návodu s PDF neověřen | Jen tmavý vzhled | `review-required` v `manual.js`, výslovný pilot |

## Stav rozpracovaných oprav k auditu

- [AI Studio #197](https://github.com/Daniel22-dev/AI-Studio-GHRAB/pull/197) – **draft, neintegrováno**; maska a sazba PDF se musí potvrdit reálným renderem obou ukázek a obsahovou kompletností.
- [AI Studio #201](https://github.com/Daniel22-dev/AI-Studio-GHRAB/pull/201) – **draft, neintegrováno**; přidává parametr `from=studio` pro „Otevřít zvlášť“, neřeší plnou navigaci.
- [Korespondenční asistent #26](https://github.com/Daniel22-dev/korespondencni-asistent/pull/26) – **draft, blokovat merge**: nová navigační úprava nemaže starý click-listener používající `window.close()`; výsledné označení může odporovat skutečné akci.
- [SORTIO #42](https://github.com/Daniel22-dev/SORTIO/pull/42) – **draft, blokovat merge**: nová podmínka PDF vyžaduje `reviewStatus=verified`, ale SORTIO dosud nemá `DOC_INFO`, proto by PDF akce zůstala skrytá.
- [GIT #125](https://github.com/Daniel22-dev/generator-testu/pull/125) – **draft, neúplné**: JS očekává existující prvek „Zpět do aplikace“, který manuál GIT neobsahuje; cesta „Zpět na manuály“ se tedy nevytvoří.

Tyto návrhy nemají být spojovány bez navazující úpravy a regresních testů. Nebyly touto auditní revizí sloučeny, nasazeny ani označeny jako funkční.

## Cílový společný kontrakt a akceptace

1. **Jednotné vědomí původu.** Rozlišit katalog / aplikaci / přímou adresu. Důvěryhodný launch context (ne libovolná cílová URL); odkazy fungují v iframe, nové kartě, PWA a při `denied`. Nenahrazovat odkaz nesouvisejícím `window.close()`.
2. **Jedna PDF akce na kontext.** U vnořeného manuálu vlastní akci Studio, u samostatného manuálu lokální ověřený export. Volitelný skutečný tisk označit „Tisknout“ a neduplikovat jej vedle PDF, není-li potřeba. Žádné prominentní interní „čeká na revizi“.
3. **PDF věcně odpovídá HTML.** Použít bezpečně identifikovaný kořen obsahu; exportovat všechny workflow, karty, tabulky, poznámky, uzavřené sekce a úplnou prohlídku i při aktivním hledání. Neexportovat API klíče, roster, studentské údaje ani odpovědi. Správná Unicode sazba, klikatelné odkazy, A4 a stránkování.
4. **Čitelnost na prvním místě.** Doporučený základ běžného textu 16 px, navigace alespoň 14 px, čitelná typografická hierarchie, normální kontrast alespoň 4,5:1, viditelný fokus a funkční ovládání na 390 / 768 / 1366 / 1920 px. Zvlášť otestovat světlo/tmu a projektor.
5. **Pravdivá obsahová revize per aplikace.** Oddělit `appVersion`, `docRevision`, `lastReviewedAt`, `reviewStatus`, `workflowChecks`. `verified` až po porovnání s reálným UI, workflow učitele a praktickém testu; CI ani stejná verze aplikace samy nestačí. Pilot a serverless omezení popisovat pravdivě.
6. **Release bez zkratek.** Samostatné opravy v aplikacích + Studio; feature → candidate → povinné CI → protected main; zabránit obcházení GARP/access guard, doložit PDF/HTML vizuální test a bezpečný návrat. Reálně nasazený smoke test je samostatný požadavek.

## Minimální regresní testy na každé z devíti aplikací

- Vstup přes **Manuály → aplikace → manuál → Manuály**, včetně samostatné karty.
- Vstup **aplikace → manuál → aplikace** bez ztráty rozpracovaného stavu.
- Přímý odkaz na manuál a bezpečný fallback do Studia.
- Bez oprávnění se nenačte chráněný obsah ani PDF; s oprávněním ano.
- Přesně jedna relevantní PDF akce, výsledek je skutečný `application/pdf`; žádná nejednoznačná tisková ikona.
- Kontrola plného seznamu kapitol, skrytých postupů, tabulek a interaktivních karet v PDF, včetně úplnosti po vyhledávání.
- Dva nezávislé PDF rendery, česká diakritika, bez černých bloků, ořezu, překryvů a nepřirozeného spojování slov.
- Ověření světla/tmy, viditelné navigace, klávesnice, čtečky a citlivých dat.
- Kontrola s aktuálním commitem, označením verze, obsahem UI a stavem certifikace.

**Závěr:** kontrola zdrojů **9/9**; skutečná PDF vizuální kontrola **2/9**; věcná/reálná browser certifikace **0/9**. Označení vše hotovo by bylo nepravdivé. Práce má pokračovat nejprve opravou společného exportu a obsahové úplnosti, pak navigací/vzhledem a nakonec věcnou revizí a testy všech devíti aplikací.
