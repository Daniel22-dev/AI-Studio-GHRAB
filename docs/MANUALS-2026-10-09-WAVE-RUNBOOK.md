# Manuály AI Studia — opravná vlna 9. 10. 2026

**Stav:** implementační drafty v oddělených větvích; **NECERTIFIKOVÁNO A NENASAZENO**. Tento dokument nesmí být používán jako automatické potvrzení obsahové aktuálnosti.

## Kontext a ověřené nálezy

- Uživatelské PDF z GIT 7.1.99 (8 stran) a SORTIO 1.1.23 (3 strany) měly černé bloky místo znaků kvůli převrácenému maskování Type3 glyphů. PDF exporter navíc nesprávně vykresloval horní linku a spojoval sousední vizuální prvky bez mezer.
- Z exportovaných PDF vypadávaly části manuálů, které nebyly běžné odstavce: SORTIO čtyřkrokový start a klávesové zkratky, manuálové otázky v akordeonech, přehledy, bezpečnostní pravidla a checklisty. Úprava DOM-to-PDF selektorů je součástí PR #197.
- PDF přepínače byly na více místech (tiskový dialog, lokální export, centrální viewer), důsledkem byly duplicitní nebo matoucí akce.
- Není správné vyvozovat obsahové ověření návodu ze synchronizace čísla verze aplikace. Většina app dokumentací je označena `review-required` a část dlouhých workflow GIT se současně opravuje.
- KA a Diferenciátor nepředávají HTTP referrer z hlavní aplikace, proto URL aplikace → manuál explicitně používá `?ghrabFrom=app`. Studio viewer používá `?ghrabFrom=studio`; samostatné otevření z katalogu `?ghrabFrom=manuals`.
- Z důvodu P5 performance budgetu se používá **jediný centrální navigační modul** ve Studiu; každý app repozitář má pouze krátký importní bootstrap. Původní vložení celého kódu do Hodnotitele vedlo k překročení `distBytes` budgetu; po centralizaci prošla jeho P5 kontrola.

## Související draft PR

| Pořadí | Součást | PR | Stav |
|---|---|---|---|
| 1 | AI Studio: PDF font, sazba, úplnost exportu + testy | [#197](https://github.com/Daniel22-dev/AI-Studio-GHRAB/pull/197) | Draft, nereleasováno |
| 2 | AI Studio: viewer, katalog, central navigation + testy | [#199](https://github.com/Daniel22-dev/AI-Studio-GHRAB/pull/199) | Draft, nereleasováno |
| 3 | GIT 7.1.99 | [#124](https://github.com/Daniel22-dev/generator-testu/pull/124) | Draft, obsah přísného režimu necertifikován |
| 3 | Korespondenční asistent 5.10.34 | [#19](https://github.com/Daniel22-dev/korespondencni-asistent/pull/19) | Draft, anonymizace / Můj e-mail vyžadují E2E |
| 3 | SORTIO 1.1.23 | [#41](https://github.com/Daniel22-dev/SORTIO/pull/41) | Draft, klasifikace funkční / serverové možnosti ověřit |
| 3 | Diferenciátor 1.3.51 | [#37](https://github.com/Daniel22-dev/diferenciator/pull/37) | Draft, PDF všech výstupních variant ověřit |
| 3 | Hodnotitel slohů 1.5.30 | [#29](https://github.com/Daniel22-dev/Hodnotitel-maturitnich-slohu/pull/29) | Draft, P5 budget po centralizaci PASS, obsahová kontrola nehotová |
| 3 | LUDUS 1.16.31 | [#29](https://github.com/Daniel22-dev/Ludus/pull/29) | Draft, dosavadní CI PASS; obsahový průchod nehotový |
| 3 | ACTIVA 0.5.30 | [#13](https://github.com/Daniel22-dev/ACTIVA/pull/13) | Draft, tabulkový export a pracovní postup ověřit |
| 3 | Lesson Hub 1.2.26 | [#9](https://github.com/Daniel22-dev/lesson-hub/pull/9) | Draft, dynamicky rendrovaný manuál ověřit |
| 3 | Maturita Desk 1.0.6 | [#10](https://github.com/Daniel22-dev/maturita-desk/pull/10) | Draft, výhradně syntetické demo; guard/manual URL ověřit |

Tracking issue: [AI Studio #198](https://github.com/Daniel22-dev/AI-Studio-GHRAB/issues/198).

## Povinná kontrolní a vydávací brána

1. **Vložený, samostatně otevřený, přímý manuál:** z katalogu vede návrat na Manuály a do AI Studia, z aplikace vede zpět do aplikace a do Studia, přímé URL vždy alespoň do Studia. Bez nekontrolovaných cizích redirect URL.
2. **Oprávnění:** bez `data-ghrab-access=granted` nelze stáhnout žádné PDF ani vidět interní obsah. Zkontrolovat také revoked, preview, PWA, dvě karty a obnovení.
3. **PDF:** uživatel vidí jen jedno označení `Stáhnout PDF`; soubor je reálně stažen, diakritika je čitelná a kopírovatelná, na stránkách nejsou tmavé masky ani diagonální linka, obsahuje skryté prohlídky a pracovní kroky. Zkontrolovat minimálně dvěma rendery, skutečné GIT + SORTIO PDF a long-page manuál.
4. **Čitelnost UI:** tmavý/světlý režim, kontrast, viditelný fokus, klávesnice, viewport 390, 768, 1366, 1920; žádné zakryté ovládání, overflow a duplicitní hlavičky.
5. **Obsahová pravdivost:** skutečný učitel otestuje poprvé / běžný postup / chybu pro všech devět aplikací, aktuální UI popisky, offline vs server-only funkce, citlivá studentská data, import/export. `reviewStatus=verified` až po podpisu a důkazu; školní server není automaticky k dispozici.
6. **Proces:** synchronizovat feature větve s aktuální `candidate`, spustit příslušné lokální testy a CI, P5/GARP/axe a přesné SHA, teprve pak candidate → chráněný main → produkční smoke. GIT nezasahovat do paralelní stabilizace bez koordinace. Nové verze a deployment identity vydat standardní pipeline; **nepushovat do main přímo**.

## Otevřené otázky pro obsahové revizory

- GIT: vyhodnocení přísného režimu, START/END, Forms/Verifier, studentské fullscreen/split-screen chování a názvy typů cvičení se teprve stabilizují. Datum dřívější „obsahové revize“ není automatický důkaz dnešní aktuálnosti.
- SORTIO: přesně popsat lokální práci se skupinami a co čeká na server (QR hlasování).
- KA: ověřit komplexní anonymizaci i samostatnou cestu „Můj e-mail“ a jejich skutečné formulace.
- Hodnotitel/ACTIVA: používat pouze anonymizované studentské vzorky; nepublikovat identifikátory ani výsledky.
- Maturita Desk: zatím jen anonymní/syntetické demo, nepředstírat produkční režim.

**Závěr:** Implementační postup a QA povinnosti jsou definovány; na konci této fáze nebyla provedena obsahová certifikace 9/9 ani produkční smoke test.
