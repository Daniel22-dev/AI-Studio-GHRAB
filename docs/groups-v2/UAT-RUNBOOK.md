# MOJE SKUPINY v2 — školní UAT (prováděcí protokol)
**Stav: NEPROVEDENO · pouze syntetické osoby · produkční vydání NO-GO.**

Doplňuje [školní akceptační tiket #349](https://github.com/Daniel22-dev/AI-Studio-GHRAB/issues/349), [bezpečnostní a vydávací bránu #343](https://github.com/Daniel22-dev/AI-Studio-GHRAB/issues/343) a [staré PWA cache #352](https://github.com/Daniel22-dev/AI-Studio-GHRAB/issues/352). Toto je návod, **nikoliv doklad, že test proběhl**.

## 0. Bezpečnostní a provozní podmínky
- Všechny účty a zařízení testuje oprávněný učitel se školním IT; použitá jména jsou vymyšlená. **Neimportujte skutečná jména, e-maily, výsledky, tokeny nebo lokální data žáků.**
- Tato stránka ani soubor `uat-evidence-template.json` **není místo pro evidenci průběhu testu**. Před prvním testem zkopírujte šablonu do schváleného soukromého úložiště školy a doplňujte výsledky výhradně tam. Do veřejného GitHubu neukládejte žádné školní účty, obrazovky se jmény ani zálohy.
- `localStorage` se SHA-256 klíčem dle učitele **není šifrované úložiště ani bezpečná hranice mezi dvěma učiteli na jednom původu**. Před prací s reálnými daty musí škola doložit serverovou autorizaci a izolaci, nebo výslovně schválit omezený režim oddělených spravovaných OS/prohlížečových profilů.
- Před každým UAT ověřte přesný aktuální HEAD **všech pěti** aplikací; číslo verze či zelené CI nestačí. AI Studio R21 i vydávací větve se mohou změnit. Reálné školní přihlášení nelze nahradit uměle vloženým tokenem nebo mock snapshotem.
- Starý service worker může nadále vracet neověřené V1 soubory. **Neklikejte na „Vymazat data webu“ či „Reset aplikace“ před ověřenou zálohou a určením vlastníka**. Starou aplikaci nelze bezpečně aktualizovat pouhou změnou repozitáře.

## 1. Příprava řízeného pilotu (A01–A05)
| ID | Zodpovědnost a nezbytný doklad |
|---|---|
| A01 | Vedení/správce údajů schválí účel, druh dat, role, retenční lhůtu, zálohování, incidenty a právní rámec |
| A02 | IT rozhodne a prokazatelně nastaví oddělení učitelů (server tenant ACL nebo výslovně schválený omezený režim spravovaných profilů) |
| A03 | IT připraví dva **skutečně ověřené** nezávislé učitelské účty A/B, revokaci, expiraci a testovací prohlížeče |
| A04 | Povolena pouze smyšlená jména a údaje; bez žákovských dat a bez odchozího e-mailu na skutečné studentské adresy |
| A05 | Do **soukromého** testovacího zápisu zapsat aktuální verze, 40znakové SHAs, zdroj a zařízení; jiný SHA znamená novou certifikaci |

### Vzorová fiktivní data
Skupina `TEST-3A4-English-2026`, školní rok `2026/27`:
```text
Ada Example; ada@example.invalid
Boris Sample; boris@example.invalid
Cora Model; cora@example.invalid
```
Účty `example.invalid` jsou pouze nedoručitelné testovací adresy pro import a kontrolu. Pro školou povolené živé Forms/Gmail testy musí IT vytvořit zvláštní interní testovací schránky a výsledky uložit pouze soukromě.

## 2. Scénáře U01–U11
| ID | Přesný postup | Podmínka PASS |
|---|---|---|
| U01 | Skutečně přihlášený A vytvoří fiktivní skupinu, zkontroluje import, zopakuje identický seznam, přidá/odebere člena a zkusí neplatný e-mail | Žádná nechtěná duplicita, validní `groupId/memberId`, revize, náhled změn |
| U02 | A otevře skupinu, odhlásí se, B se přihlásí na témže zařízení; zkontrolovat otevřenou kartu, seznam, oznámení, zpětnou navigaci a browser storage | B neuvidí data A; **úspěch UI nezastupuje důkaz bezpečného oddělení samotného storage** |
| U03 | U A odvolat oprávnění, vypršet platnost, otevřít starou kartu a provést obnovu online/offline | Žádné další čtení/zápis a žádný neověřený fallback V1 |
| U04 | Jen po prokazatelném určení původního vlastníka V1: v izolovaném prostředí exportovat zálohu, ověřit integritu, schválit migraci a porovnat identifikátory | Nezměněná `groupId/memberId`, revize a archivace, zachovaná původní V1; jinak **BLOCKED** |
| U05 | SORTIO: načíst skupinu, změnit revizi, archivovat člena, otevřít jiného učitele | Pouze jména, bez e-mailů; stabilní místní historie a bezpečné odmítnutí cizího přístupu |
| U06 | Lesson Hub: vybrat skupinu a zkontrolovat dostupný obsah integrace | Pouze metadata skupiny, žádné členství/e-maily ani skrze vývojářské funkce klienta |
| U07 | Hodnotitel: propojit fiktivní seznam, změnit kontakt při potvrzovacím dialogu i po pokusu o odeslání | HOLD a nové schválení příjemce; žádná změna osmi hodnoticích kritérií či známky |
| U08 | GIT: vytvořit fiktivní kódy, provést schválený test Forms/Sheets a oddělit učitelské a studentské rozhraní | Moje skupiny neobsahují kódy, odpovědi ani výsledky; pouze oprávněný učitel vidí administraci |
| U09 | Ve dvou kartách změnit revizi, text importu, režim `replace` nebo cílovou skupinu, včetně čekání na Web Lock | Stará či odlišná data se bezpečně odmítnou; po novém náhledu proběhne právě jeden zápis |
| U10 | Po ověřené záloze otestovat starý instalovaný PWA SW, offline otevření, nové vydání a aktivaci cache na spravovaném profilu | Aktuální kontrolovaný kód a manifest; stará V1 služba se nesmí použít |
| U11 | V odděleném testu simulovat přerušenou aktualizaci, odebrání účtu, souběžnou obnovu zálohy a poškozený úložištní záznam | Neztratí se novější práce; nejprve se uchová originál, rollback je doložený; žádný tichý přepis |

## 3. Matice fyzických zařízení
V soukromé evidenci zaznamenat u každého zařízení pro každou relevantní skupinu scénářů výsledek `PASS`, `FAIL`, `BLOCKED` nebo `NOT_RUN`: **Windows Chrome, Windows Edge, Android Chrome, iPhone Safari, iPad Safari**, včetně dostupné funkce Split View/Slide Over. U každého běhu zaznamenat typ browser profilu, aktuální pětici SHA, verzi PWA/SW a identifikátor soukromého protokolu. iOS/iPadOS BYOD webová stránka **nemůže garantovat zákaz přepínání aplikací**; tuto vlastnost nehodnotit jako schopnost vynutit fyzické testovací podmínky.

## 4. Starý SW, migrace a rollback — povinné pořadí
1. Zmapovat všechna školou spravovaná zařízení, staré PWA instalace a otevřené karty. U cizího BYOD zařízení netvrdit, že bylo vzdáleně opraveno.
2. Identifikovat a potvrdit vlastníka staré V1 evidence; v jeho profilu vytvořit a v soukromém prostředí ověřit zálohu **před** zásahy do cache nebo `localStorage`.
3. Na testovacím profilu uzavřít staré karty, explicitně aktivovat správnou verzi service workeru a porovnat verzi kódu/manifestu. Samotná existence nového SW ve stavu `waiting` nestačí.
4. Provést U02–U03 a U09–U11 ještě před pokusem o reálnou migraci; doložit odmítnutí starého a cizího klienta.
5. Provést kontrolovaný návrat k původnímu stavu, ověřit archivaci/ID a identitu ostatních aplikací. Zvlášť vyhodnotit částečné vydání napříč pěti samostatnými repozitáři.
6. Pokud chybí byť jediný doklad bezpečnosti, profil musí zůstat **BLOCKED**, bez použití žákovských dat.

## 5. Soukromá evidence, podpisy a rozhodnutí
K každému testu ukládat **jen do schváleného soukromého prostředí**: ID `U01–U11`, přesný SHA všech aplikací, zařízení/browser, školního svědka, čas, výsledek, obecný kód chyby a odkaz na privátní evidenci; žádná reálná jména, e-maily, kopie storage nebo screenshoty s PII do veřejného repozitáře.

Povinné schválení: **D01** učitel/provozní garant, **D02** IT správce, **D03** odpovědná osoba školy/správce údajů, **D04** vlastník vydání pro přesnou pětici SHA, **D05** nezávislé finální protected CI a ověřená skutečná identita nasazení. Nevyplněný nebo neprovedený případ = **NO-GO**. Ani vyplnění šablony automaticky nepředstavuje školní souhlas.

Pro GIT je stále samostatně nutno spustit původní read-only workflow `p5-release-gate.yml` a `journey-e2e.yml` v repozitáři GIT přes `workflow_dispatch` na předem zkontrolovaném přesném SHA. Žádná jiná QA větev nenahrazuje původní chráněnou certifikaci.
