# Obsahový audit manuálů AI Studia — 9 aplikací

**Datum:** 9. 10. 2026 · **Rozsah:** kontrola českých příruček oproti zdrojovým UI komponentám, aplikační logice a vydaným commitům.

**Důležité:** Jde o statický audit doložených scénářů. Nejde o živou akceptaci pod školním účtem ani formální pedagogické schválení. Stav `review-required` zůstává zachován.

## Matice kontrol a výsledků

| Aplikace, verze | Exact main SHA při kontrole | Kontrolované věcné postupy | Výsledek |
|---|---|---|---|
| GIT 7.1.99 | `a111d7f610c3329349d6a6e2e11961d54563eb67` | První konfigurace, Forms a rozesílač, START/END, secure verifier, nouzové pokračování, bezpečnostní události | Nalezeny nedostatečné instrukce k řešení zámku a interpretaci událostí; oprava [#127](https://github.com/Daniel22-dev/generator-testu/pull/127) |
| Diferenciátor 1.3.51 | `a45e6472a4b15fdbe2b6c2b403624c6bf076dc1c` | Import, CEFR, tvorba tří variant, bodování, kontrola a PDF | Ve vzorkovaných scénářích nenalezen věcný rozpor |
| Hodnotitel 1.5.30 | `d9154217d5efa94ec10d95a39616c68101a13517` | Série, import ZIP, přepis, anonymizace, rubrika, validace a schválené exporty | Ve vzorkovaných scénářích nenalezen věcný rozpor |
| Korespondenční asistent 5.10.34 | `8e5e8a66452faff1de5d1e8ee66eab25218e5bfb` | Příchozí zpráva, vlastní e-mail, volby režimů, práce s údaji a návratová navigace | Chybné názvy voleb a popis chování nové karty; oprava [#45](https://github.com/Daniel22-dev/korespondencni-asistent/pull/45) |
| LUDUS 1.16.31 | `a5ac946600fba95fe9c4f77ac7a7a5b440945f0d` | Mechanika, svět, Lesson pack, třídní soutěž, export a bezpečnost her | Ve vzorkovaných scénářích nenalezen věcný rozpor |
| ACTIVA 0.5.30 | `80cc04cf86c34ae4545e572a2083e742783ddf1d` | Katalog typů, zdroj → aktivity → generování → editor, varianty, tisk a knihovna | Ve vzorkovaných scénářích nenalezen věcný rozpor |
| SORTIO 1.1.23 | `662cdcad6ae1fbc57d985408beabeeb97fc1a38f` | Import třídy, docházka, skupiny, projektor, klávesnice, zasedací PDF | Ve vzorkovaných scénářích nenalezen věcný rozpor |
| Lesson Hub 1.2.26 | `2aa24e6c3309e300374ab6b7a5264c481d03eac1` | Rychlé nastavení, hodiny, materiály, lokální provoz, serverové funkce, suplování | Nedostatečné rozlišení lokálních a připojených funkcí; oprava [#14](https://github.com/Daniel22-dev/lesson-hub/pull/14) |
| Maturita Desk 1.0.6 | `deac39cfec517810b5a185246a63c9b6b30e2b94` | Nácvik, syntetické demo, preflight, učitelské pokyny, časové fáze zkoušky | Ve vzorkovaných scénářích nenalezen věcný rozpor |

## Podkladové soubory

- **GIT:** [manuál](https://github.com/Daniel22-dev/generator-testu/blob/a111d7f610c3329349d6a6e2e11961d54563eb67/public/manual/index.html), [UI](https://github.com/Daniel22-dev/generator-testu/blob/a111d7f610c3329349d6a6e2e11961d54563eb67/src/shell.html), [studentský runtime](https://github.com/Daniel22-dev/generator-testu/blob/a111d7f610c3329349d6a6e2e11961d54563eb67/src/js/13e-secure-student-runtime.js).
- **Diferenciátor:** [manuál](https://github.com/Daniel22-dev/diferenciator/blob/a45e6472a4b15fdbe2b6c2b403624c6bf076dc1c/src/manual/index.html), [UI](https://github.com/Daniel22-dev/diferenciator/blob/a45e6472a4b15fdbe2b6c2b403624c6bf076dc1c/src/body.html), [výstup](https://github.com/Daniel22-dev/diferenciator/blob/a45e6472a4b15fdbe2b6c2b403624c6bf076dc1c/src/js/40-vystup-pdf-kvalita.js).
- **Hodnotitel:** [manuál](https://github.com/Daniel22-dev/Hodnotitel-maturitnich-slohu/blob/d9154217d5efa94ec10d95a39616c68101a13517/src/manual/index.html), [UI](https://github.com/Daniel22-dev/Hodnotitel-maturitnich-slohu/blob/d9154217d5efa94ec10d95a39616c68101a13517/src/body.html), [hodnoticí kontrakt](https://github.com/Daniel22-dev/Hodnotitel-maturitnich-slohu/blob/d9154217d5efa94ec10d95a39616c68101a13517/src/js/45-evaluation-contract.js).
- **Korespondenční asistent:** [manuál](https://github.com/Daniel22-dev/korespondencni-asistent/blob/8e5e8a66452faff1de5d1e8ee66eab25218e5bfb/src/manual/index.html), [UI](https://github.com/Daniel22-dev/korespondencni-asistent/blob/8e5e8a66452faff1de5d1e8ee66eab25218e5bfb/src/body.html), [navigace](https://github.com/Daniel22-dev/korespondencni-asistent/blob/8e5e8a66452faff1de5d1e8ee66eab25218e5bfb/src/manual/navigation-context.js).
- **LUDUS:** [manuál](https://github.com/Daniel22-dev/Ludus/blob/a5ac946600fba95fe9c4f77ac7a7a5b440945f0d/public/manual/index.html), [aplikace](https://github.com/Daniel22-dev/Ludus/blob/a5ac946600fba95fe9c4f77ac7a7a5b440945f0d/src/index.html), [runtime](https://github.com/Daniel22-dev/Ludus/blob/a5ac946600fba95fe9c4f77ac7a7a5b440945f0d/runtime/ludus-engine-runtime.js).
- **ACTIVA:** [manuál](https://github.com/Daniel22-dev/ACTIVA/blob/80cc04cf86c34ae4545e572a2083e742783ddf1d/src/manual/index.html), [UI](https://github.com/Daniel22-dev/ACTIVA/blob/80cc04cf86c34ae4545e572a2083e742783ddf1d/src/body.html), [registry](https://github.com/Daniel22-dev/ACTIVA/blob/80cc04cf86c34ae4545e572a2083e742783ddf1d/src/js/25-subject-packs.js).
- **SORTIO:** [manuál](https://github.com/Daniel22-dev/SORTIO/blob/662cdcad6ae1fbc57d985408beabeeb97fc1a38f/src/manual/index.html), [UI](https://github.com/Daniel22-dev/SORTIO/blob/662cdcad6ae1fbc57d985408beabeeb97fc1a38f/src/body.html), [zkratky](https://github.com/Daniel22-dev/SORTIO/blob/662cdcad6ae1fbc57d985408beabeeb97fc1a38f/src/js/93-keyboard-accessibility.js).
- **Lesson Hub:** [manuál](https://github.com/Daniel22-dev/lesson-hub/blob/2aa24e6c3309e300374ab6b7a5264c481d03eac1/public/manual/manual.js), [server](https://github.com/Daniel22-dev/lesson-hub/blob/2aa24e6c3309e300374ab6b7a5264c481d03eac1/src/pages/server.js), [zastupování](https://github.com/Daniel22-dev/lesson-hub/blob/2aa24e6c3309e300374ab6b7a5264c481d03eac1/src/pages/substitution.js).
- **Maturita Desk:** [manuál](https://github.com/Daniel22-dev/maturita-desk/blob/deac39cfec517810b5a185246a63c9b6b30e2b94/manual/index.html), [UI](https://github.com/Daniel22-dev/maturita-desk/blob/deac39cfec517810b5a185246a63c9b6b30e2b94/src/main.js), [Exam Engine](https://github.com/Daniel22-dev/maturita-desk/blob/deac39cfec517810b5a185246a63c9b6b30e2b94/src/exam-engine.js).

## Zbývající finální akceptace

Zvoleným učitelským účtem na nasazené verzi zkontrolovat u každé aplikace: (1) přístup povolený i zamítnutý; (2) otevření manuálu ze Studia, přímo z aplikace i samostatným odkazem a správný návrat; (3) popsaný první postup, typickou práci a jednu chybu; (4) čitelnost na počítači i mobilním zařízení a případně iPadu; (5) kompletnost exportu PDF bez interních údajů; (6) skutečnou totožnost kontrolované verze; (7) písemné potvrzení odpovědným učitelem. Testovat pouze syntetická nebo anonymizovaná studentská data.

**Akceptace zatím není doložena pro žádný z 9 manuálů.** Nesnižovat ochranný status `review-required` a neoznačovat redakčně jako `verified` bez schválení. Centrální [audit #198](https://github.com/Daniel22-dev/AI-Studio-GHRAB/issues/198) ponechat otevřený.
