# ETAPA D — audit a implementační plán uživatelských manuálů
**Datum:** 8. 10. 2026  
**Stav:** D1 – zdrojový audit dokončen; D2–D5 postupně k implementaci  
**Rozsah:** zbývajících osm aplikací + stávající školení AI Akademie.  
**Referenční stav:** větve `candidate` při auditu; verze a soubory viz níže.

## 1. Inventura

| Aplikace | Verze candidate | Zdrojový manuál | Zdroj pro PDF | Riziko / priorita |
|---|---|---|---|---|
| Diferenciátor | 1.3.51 | `src/manual/index.html` | HTML + `MANUAL.map/tour` | P1: prohlídka se přepíná JS, musí být v PDF celá |
| Hodnotitel maturitních slohů | 1.5.30 | `src/manual/index.html` + `src/manual/manual.js` | HTML + `MANUAL.map/tour` | P1: kompletnost skórovacích a kontrolních workflow, ochrana studentských dat |
| Korespondenční asistent | 5.10.34 | `src/manual/index.html` | HTML + `MANUAL.map/tour` | P1: anonymizace, režim Můj e-mail; `manualVersion` 1.3.16 je samostatná revize, ne chyba |
| LUDUS | 1.16.31 | `public/manual/index.html` | HTML + `MANUAL.map/tour` | P1: dynamická prohlídka, soukromí a export her |
| ACTIVA | 0.5.30 | `src/manual/index.html` + `src/manual/manual.js` | Všechny obsahové sekce po ověřeném přístupu | P2: zkontrolovat print/PDF vs. PDF vytvořených aktivit; obsah citlivý na CSP |
| SORTIO | 1.1.23 | `src/manual/index.html` | Celý statický obsah | P2: úvodní provozní workflow, lokální data, ochrana přístupu |
| Lesson Hub | 1.2.26 | `public/manual/index.html` + `public/manual/manual.js` | Všechny obsahové sekce po renderu | P2: manuál má malou HTML obálku, hlavní obsah generuje JS; nejde o prázdný manuál |
| Maturita Desk | 1.0.6 | samostatné `manual/index.html` neexistuje | pouze integrovaná nápověda aplikace | P1: dořešit samostatný, oprávněním chráněný manuál a odpovídající export |

Při auditu nebyl proveden login na školní účet ani prohlížečová certifikace uživatelských rolí. Tato inventura **není** certifikací obsahu aplikací. Všechny vydávané návody musí vycházet z aktuálního UI k danému commitu.

## 2. Zásadní zjištění

1. **Dynamické kroky jsou pro PDF ztrátové**, pokud se kopíruje jen právě zobrazená karta prohlídky. Každý manuál s datovým objektem `MANUAL.map/tour` musí dodat celý obsah jako strukturovaný export `window.GHRAB_MANUAL_EXPORT`.
2. **PDF není pouhý tisk.** Vyžadujeme skutečný PDF dokument vytvořený v rámci oprávněného prohlížeče, kopírovatelný český text, správné stránkování a odkazy. Formulářové hodnoty, roster ani tajemství do PDF nepatří.
3. **Ochrana manuálu je podmínka exportu.** Export začíná pouze při `data-ghrab-access="granted"`, nikoli jen po události `iframe.load`. Neověřený, cizí či nenahraný manuál nesmí dostat tlačítko PDF.
4. **Deklarace úplnosti je per-aplikace**, ne globální. Neověřeným manuálům PDF tlačítko neslibujeme. I po statickém auditu následuje browser a obsahová certifikace.
5. **Verzi aplikace a revizi manuálu oddělujeme.** `data-manual-version` u Korespondenčního asistenta nesmí být chybně automaticky přepisována aplikační verzí.
6. **Maturita Desk je architektonická výjimka** — nejde ji „opravit“ jen povolením tlačítka PDF v centrálním vieweru. Vyžaduje vlastní bezpečný manuál.
7. **Dlouhý kurz GIT v AI Akademii** má metadata ověření pro 7.1.59, zatímco GIT je 7.1.99. Tři nové krátké prezentace Akademie jsou označené jako pilotní; nemění samy o sobě aktuálnost dlouhého kurzu.

## 3. Cílový kontrakt pro jeden manuál

- **Poprvé:** skutečný přístup, konfigurace AI/integračních prostředků jen tam, kde se používají, a ověření po prvním vytvoření výstupu.
- **V hodině / při každém použití:** posloupnost od cíle k výsledku, co přesně zmáčknout, kontrolní bod, uložení nebo export.
- **Když něco nejde:** minimální diagnostika se zamezením sdílení citlivých údajů.
- **Pokročilé:** skryté až po základní cestě; nápověda bez nutnosti technické znalosti.
- **PDF:** obsahuje také skryté části a celé datové prohlídky, ale žádné privátní runtime údaje.
- **Metadata:** `appVersion`, `docRevision`, `lastReviewedAt`, `reviewStatus` (`verified | review-required | pilot`) a seznam ověřených workflows.

## 4. Pořadí realizace

1. **D2-P1:** přidat plnohodnotný export obsahu pro Diferenciátor, Hodnotitel, Korespondenční asistent a LUDUS; zrevidovat uživatelské cesty, nepřidávat neověřená tvrzení.
2. **D2-P2:** ACTIVA, SORTIO, Lesson Hub: ověřit sémantický obsah a úplnost všech sekcí, sjednotit vstupní cestu.
3. **D2-P1 výjimka:** Maturita Desk: samostatný chráněný manuál, potom PDF.
4. **D3:** aktualizovat velký kurz GIT v AI Akademii podle aktuálního 7.1.99 workflow; zkontrolovat ostatní kurzy a zdroje dat.
5. **D4:** až po prověření exportních kontraktů zapnout ve Studiu PDF pro schválené aplikace, ověřit odkazy Akademie → Manuály.
6. **D5:** nové změny pouze ve feature větvích → review → `candidate` → exact-SHA CI/GARP → Safe Promotion do chráněné `main`. Označení „LIVE“ teprve po dostupném produkčním smoke testu.

## 5. Akceptace

- Učitel zvládne každý příslušný workflow bez asistence autora; funkčnost potvrdit skutečným účtem a testovacími daty.
- U všech zahrnutých aplikací se manuál otevře se správným oprávněním a odmítne nepovoleného uživatele.
- PDF obsahuje všechny kroky, českou diakritiku, odkazy a žádné privátní údaje; projde delším dokumentem i mobilním viewportem.
- Projekce Akademie (Win+P → Rozšířit) zobrazí čistý slide na projektoru a ponechá soukromé poznámky na notebooku.
- Certifikace a nasazení bez bypassu bezpečnostních bran; úspěšný CI je nutný, nikoliv důkaz reálného pedagogického testování.

**Rozhodnutí:** nepovolovat export PDF u všech aplikací jedním univerzálním přepínačem. Rozšířit ho po obsahových a přístupových důkazech.

## 6. Stav implementace a pull requesty (8. 10. 2026)

Zdrojové návrhy jsou hotové, ale většina záměrně čeká v PR na vlastní QA, aby nebylo z veřejného katalogu možné stáhnout neúplný PDF dokument.

| Součást | PR | Stav z hlediska Etapy D |
|---|---|---|
| Diferenciátor – úplná map/tour data | [#35](https://github.com/Daniel22-dev/diferenciator/pull/35) | Kód připraven, CI a PDF akceptace |
| Hodnotitel – úplná map/tour data | [#25](https://github.com/Daniel22-dev/Hodnotitel-maturitnich-slohu/pull/25) | Kód připraven, automatické základní testy, obsahová revize |
| Korespondenční asistent – úplná map/tour data | [#13](https://github.com/Daniel22-dev/korespondencni-asistent/pull/13) | Kód připraven, ochrana dat a PDF akceptace |
| LUDUS – úplná map/tour data | [#25](https://github.com/Daniel22-dev/Ludus/pull/25) | Kód připraven, zdrojová QA, PDF akceptace |
| ACTIVA – tabulkové přílohy PDF | [#11](https://github.com/Daniel22-dev/ACTIVA/pull/11) | Kód připraven, obsahová QA |
| Lesson Hub – dynamická upozornění PDF | [#7](https://github.com/Daniel22-dev/lesson-hub/pull/7) | Kód připraven, render a PDF QA |
| SORTIO | zatím bez PR | Nedokončeno: zápis do chráněného manuálu zablokoval dostupný nástroj; zdrojový audit proběhl |
| Maturita Desk – samostatný manuál | [#8](https://github.com/Daniel22-dev/maturita-desk/pull/8) | Obsah a chráněná stránka připraveny, nutný runtime test permitu, Pages a dostupnost ve Studiu |
| AI Studio – dokumentační kontrakt a PDF gate | [#191](https://github.com/Daniel22-dev/AI-Studio-GHRAB/pull/191) | Kód připraven, před nasazením závisí na ověření konkrétních aplikací |
| AI Akademie – velký kurz GIT 7.1.99 | [#29](https://github.com/Daniel22-dev/AI-Akademie-GHRAB/pull/29) | Sloučeno do candidate 1.5.7, P5 candidate GREEN; vydání main samostatně řízené |

### Release pravidlo

Nesmí se jedním sloučením zapnout PDF na všech osmi aplikacích. Manuál označený `review-required` či `pilot` je obsahově návrh, nikoli publikovaná certifikace. PDF nárok vzniká až při `reviewStatus=verified` spolu s účinným app permit a aktuálním `appVersion`.

### Objektivně zbývající práce

- U sedmi chráněných manuálů ověřit browser + reálný PDF obsah a test nepovoleného přístupu.
- Dokončit SORTIO, který zatím nemá změnu zdrojů.
- U Maturita Desk ověřit guard proti oprávnění a správně sestavenou Pages cestu `/manual/`; stále pouze syntetické demo.
- Ověřit celou posloupnost Studio viewer → aplikace → manuál → PDF a školitele na Win+P Rozšířit.
- Vydat nezávisle ověřené komponenty přes jejich candidate a protected main. Teprve pak aktualizovat deklarace `verified`.

Vydávací status nesmí předstírat, že výše uvedené QA již proběhlo.
