# Conversation Lab GHRAB — návrh rizikové třídy S0 (NEÚČINNÝ)

**Stav:** `NÁVRH / NESCHVÁLENO` • **Datum:** 18. 10. 2026 • **Vazba:** GARP 2.7, Conversation Lab 0.9.2 • **Evidence:** [GitHub úkol #269](https://github.com/Daniel22-dev/AI-Studio-GHRAB/issues/269)

## Proč je tento dokument potřeba
Claude Opus provedl oddělenou **technickou AI oponenturu** podepsaného veřejného vydání Conversation Lab 0.9.2. Zjistil jednu nízkou chybu kódu F-01 (v dalších zdrojích opravenou) a provozní rizika zejména u hostingu. Oponentura není lidskou bezpečnostní certifikací, externím penetračním testem ani souhlasem vedení školy. Navrhujeme proto předem **formálně upravit** pravidla pro nízkorizikové veřejné statické aplikace, nikoli dodatečně falešně označit existující `NOT_GRANTED` za `GRANTED`.

Tento návrh **nemění GARP**, není rozhodnutím školy a **neaktivuje** žádný modul, registr ani učitelský launcher. Vstup do produkčního AI Studia nadále zůstává zablokovaný v `PRELIVE_HOLD`.

## Kdy lze použít třídu S0
Aplikace musí současně splňovat všechny měřitelné podmínky:

1. Obsah je anonymně veřejně čitelný; student se nepřihlašuje a systém nesbírá odpovědi, známky ani identifikátory.
2. Není vlastní backend, databáze, zápis do úložišť prohlížeče, Service Worker ani zpracování citlivých dat.
3. Veřejná aplikace neobsahuje AI/API klíč, externí překladové volání, telemetry ani požadavky na jiné domény; obsah lekcí a glos je offline.
4. Veřejné soubory tvoří uzavřený seznam se SHA-256 a předem schváleným obsahem; souhlas vlastníka je ověřen proti důvěryhodnému veřejnému klíči Studia.
5. JavaScript neprovádí nebezpečné vkládání HTML/JS ani libovolné přesměrování; web používá přísné bezpečnostní hlavičky, CSP, ochranu proti rámování a `no-store`.
6. Není předáván učitelský token, oprávnění, e-mail, identita ani parametr z AI Studia na externí studentský web.
7. Veškerý vývoj je oddělený od vydávání, bez automatické produkční propagace; příznaky `PRELIVE_HOLD` nesmí být obcházeny.
8. Závažné nálezy jsou opraveny a regresně otestovány; každý zbylý nález má evidovaný dopad, vlastníka a termín dalšího řešení.
9. Jsou určeni správci hostingu, MFA a postup návratu zpět; je vyřešen přístup ke starším náhledovým deploymentům.
10. Informování o zpracování provozních údajů hostingu posoudila příslušná školní role pro ochranu osobních údajů.

**Ztratí-li aplikace některé kritérium** (např. evidence studentů, AI API, ukládání odpovědí nebo serverové přihlašování), S0 se nepoužije bez nové klasifikace. S0 pro veřejný přehrávač **neznamená**, že AI Studio, serverové sessions, přístupová politika CLB-01 nebo GARP/P5 automaticky dostávají stejnou úlevu.

## Navrhovaná minimální kontrola S0
- Ověřená technická oponentura druhým modelovým systémem a opakovatelné negativní/regresní testy; lidský bezpečnostní odborník je vhodný při vyšší rizikovosti.
- Přesná shoda **živé** nasazené verze s podepsanými SHA-256 všech dosažitelných souborů; zkontrolovat také MIME, CSP, HTTP 404, cookies a WebKit/Safari.
- Kontrola reálné správy Cloudflare účtu, MFA, starších deploymentů, vlastnictví a možnosti rollbacku.
- **Výslovná písemná akceptace** zbývajících rizik osobou, která má pravomoc jednat za školu; vývojář nesmí sám za instituci tvrdit, že bylo schváleno.
- Samostatné bezpečné vydání do Studia až po P5, obvyklé revizi a schválení přesného commitu; žádné automatické povýšení na produkční registr.

## Konkrétní vydání 0.9.2
| Parametr | Hodnota |
|---|---|
| Aplikace | Conversation Lab GHRAB |
| Release ID | `cl-ai-b1-pilot-20261018-r2` |
| ZIP SHA-256 | `eeca610e36ea3f11366297728af39510ee9541f8960de72c444ea6683a8f84c0` |
| Owner ES256 statement SHA-256 | `6f0588801d7ec4bc5b3314a4e351603cd6993890ef56b2a636ee497d0b3848c5` |
| Obsah | 1 lekce AI/EN/B1, 8 stanovišť, 37 schválených offline českých glos |
| Studio | Učitelská politika CLB-01; studentský vstup zůstává anonymní |
| Claude oponentura | `TECHNICAL_PRE_GO`; není `SECURITY_GO` ani lidské schválení |
| Nasazení 0.9.2 a institucionální akceptace | **DOSUD NEDOLOŽENO** |

## Zbylá rizika, která se nesmějí skrýt
- **F-01 LOW**: ve *podepsané* 0.9.2 lze po odmítnutí chybného originu přes hashchange znovu načíst veřejnou lekci. Neodhaluje neveřejná data; oprava je už v soukromém zdrojovém `main` pro následující nově podepsanou verzi.
- **F-03 MEDIUM (provoz)**: Cloudflare Pages je dle projektové evidence na osobním účtu, náhledové deploymenty mohou zůstat dostupné. Je potřeba správa odpovědnosti a MFA, kontrola starých nasazení.
- **F-04 LOW**: samotná aplikace neukládá data studentů, ale hosting zpracovává technické provozní údaje (např. IP adresu). Informování a smluvní uspořádání musí posoudit škola.
- **F-05 LOW (proces)**: rozhodovací přepínače v `launch-control.json` jsou dnes nepodepsané řetězce; před aktivací vyžadují schválenou revizi/ochranu větví, případně samostatný podepsaný akceptační záznam s jiným klíčem než podpis obsahu.
- **F-06 LOW**: administrátorská výjimka ze školení CLB-01 a kontrola v `server-session` musí být rozhodnuté a zdokumentované; serverovou část nelze certifikovat bez nasazení.

## Požadovaná rozhodnutí
Třídu S0 a akceptaci rizik musí přijmout oprávněná školní role formou doložitelného rozhodnutí; případně je nutné ověřit, zda jde zatím pouze o osobní veřejný pilot, nikoli oficiální školní službu. **Dokud takové rozhodnutí neexistuje, současná pravidla GARP 2.7 a brány NO-GO platí beze změny.**

Vydávací kontrolní seznam a nepodepsaný záznam akceptace jsou v sousedním dokumentu `CLB_S0_AKCEPTACE_RIZIK_NEPODPISANY_VZOR_2026-10-18.md`.
