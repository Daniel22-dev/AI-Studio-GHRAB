# Etapa D — sjednocení Manuálů a AI Akademie
**Stav:** pracovní implementace, aktualizováno 8. 10. 2026. Tento dokument nepotvrzuje publikování žádné dosud neschválené změny.

## Pevně oddělené produkty
- **AI Studio → Manuály:** samostatný návod pro učitele, kompletní první nastavení, reálné postupy, diagnostika a přímé PDF po přiznání oprávnění.
- **AI Akademie:** řízené školení s nezávislým čistým projekčním oknem, soukromou konzolí školitele a jeho poznámkami. Účastník získává krátký PDF handout, podrobná nápověda je vždy ve Studiu.
- **CI release identita není věcná revize manuálu.** Vydání aplikace nesmí být prezentováno jako automatický důkaz správnosti instruktážního textu.

## Inventura k 8. 10. 2026 (candidate)
| Aplikace | Cílová verze | Zdroj manuálu | Etapa D návrh | Dosavadní zvláštnost |
|---|---|---|---|---|
| Diferenciátor | 1.3.50 | \`src/manual/index.html\` | [PDF PR #34](https://github.com/Daniel22-dev/diferenciator/pull/34) | dynamická prohlídka/mapa potřebuje plný export |
| Hodnotitel maturitních slohů | 1.5.30 | \`src/manual/index.html\`, \`manual.js\` | [PDF PR #24](https://github.com/Daniel22-dev/Hodnotitel-maturitnich-slohu/pull/24) | aktivace až po úspěšném school-permit guardu |
| Korespondenční asistent | 5.10.34 | \`src/manual/index.html\` | [PDF PR #12](https://github.com/Daniel22-dev/korespondencni-asistent/pull/12) | verze manuálu 1.3.16 je samostatná revize textu, ne drift app verze |
| LUDUS | 1.16.31 | \`public/manual/index.html\` | [PDF PR #23](https://github.com/Daniel22-dev/Ludus/pull/23) | dynamická mapa a prohlídka |
| ACTIVA | 0.5.30 | \`src/manual/index.html\` | [PDF PR #10](https://github.com/Daniel22-dev/ACTIVA/pull/10) | 12 obsahových oddílů a oddělený chráněný bootstrap |
| SORTIO | 1.1.23 | \`src/manual/index.html\` | [PDF PR #38](https://github.com/Daniel22-dev/SORTIO/pull/38) | build nahrazuje statický CSP token, nevypínat guard |
| Lesson Hub | 1.2.26 | \`public/manual/index.html\`, dynamické \`manual.js\` | [PDF PR #6](https://github.com/Daniel22-dev/lesson-hub/pull/6) | 25 sekcí sestavovaných po potvrzení přístupu |
| Maturita Desk | 1.0.6 | původně integrovaná nápověda v aplikaci | [Samostatná příručka PR #7](https://github.com/Daniel22-dev/maturita-desk/pull/7) | controlled pilot/AMBER; veřejná adresa pouze pro syntetické demo, živé confidential zkoušení nesmí být slibováno |

**Stav každého PR:** návrh v izolované větvi, **NOT MERGED / NOT CERTIFIED**, dokud jej explicitně nepotvrdí jeho vlastní CI, P5/GARP a Safe Promotion.

## PDF kontrakt
1. PDF vytváří uživatel lokálně až po úspěšném ověření školního app-permitu; bez veřejného statického PDF dokumentu.
2. Export je skutečný PDF dokument s českým Unicode ToUnicode mapováním, textovými běhy, funkčními HTTP(S) odkazy, stránkováním a A4. Není automaticky PDF/UA; přístupnost je nutné ověřit zvlášť.
3. Rozbalovací položky a dynamické prohlídky se exportují celé. U čtyř aplikací se předávají i strukturované podklady \`MANUAL.map\` a \`MANUAL.tour\`. U dynamického Lesson Hubu se pro export dočasně odstraní vyhledávací filtr a po stažení se obnoví.
4. Kontrola přístupu je opatření UX/provozu; veřejné open-source soubory samy o sobě nejsou důvěrným úložištěm. Do manuálu ani exportu se nedávají školní tajemství, API klíče ani studentské výsledky.
5. U každé aplikace ověřit českou diakritiku a kopírovatelný text, všechny kapitoly, link anotace, více stran, mobilní zobrazení a zamítnuté oprávnění.

## AI Akademie — obsahový drift
- [PR #28](https://github.com/Daniel22-dev/AI-Akademie-GHRAB/pull/28): rozsáhlé školení GIT přechází z revize **7.1.59** na pilotní metodiku **7.1.99**, včetně START/END, originálního CSV, Verifieru a ochrany Recovery kódu. Celkový čas 100 minut zůstává zachovaný.
- Akademie explicitně označuje neaktuální stávající školení (AI Studio, LUDUS, Korespondenční asistent, SORTIO) jako \`review-required\`, dokud neprojdou vlastní obsahovou revizí.
- Účastnický handout k dlouhému školení GIT nyní obsahuje bezpečné kroky místo pouze obecného „exportuj HTML“.

## Certifikační podmínky
- P0: **žádné oslabení ochrany manuálů** nebo přepnutí app protect na open.
- P0: **Maturita Desk neumožní CONFIDENTIAL-EXAM na veřejném originu** a manuál to pravdivě vysvětluje.
- P1: Přímý PDF export pouze po \`data-ghrab-access=granted\`. Test zamítnutého přístupu.
- P1: Nejsou ztraceny kroky interaktivních tour, odborný obsah ani české znaky.
- P1: Build z kandidáta musí obsahovat všechny nové moduly; žádné 404 a žádné blokace CSP.
- P1: Aktuální app verze a GARP/release metadata sjednocené, správně navýšené číslo verze při vydání.
- P1: Přesné SHA P5, GARP FOUNDATION, browser smoke a schválená Safe Promotion cesta \`candidate → protected main\`.
- P2: Klávesnice, čtečky, responzivita, projekce Win+P → Rozšířit a správná oddělená konzole Akademie.
- P2: Nezávislá zkouška s netechnickou kolegyní v Etapě E.

## Pravidla pro aktualizace
- Nová verze aplikace automaticky **zpochybní obsahové ověření** manuálu a navázaného školení; nesmí sama aktualizovat \`lastReviewedAt\`.
- Změna názvu tlačítka / kroku workflow musí aktualizovat příslušný manuál a školící slide, nebo vyvolat review-required s odůvodněním.
- PDF a HTML mají pocházet ze stejných udržovaných textů; test musí odhalit chybějící kapitolu či dynamický krok.
- Vydání jedné aplikace není certifikací zbývajících aplikací ani důkazem jejich školního nasazení.

**Status Etapy D:** implementační návrhy vytvořené; před jejím uzavřením chybí per-repo vydávací verze, reálná verifikace a dokončená certifikace všech PR. Fyzická zkouška dvou obrazovek a kolegyň zůstává v Etapě E.
