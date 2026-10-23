# Conversation Lab – Správce témat: samoobslužný hromadný import

**Nová učitelská funkce, oddělená od neměnné podepsané aplikace Conversation Lab 0.11.0.**

## Co skutečně funguje

- Hromadně vybrat či přetáhnout HTML konverzační karty (`const CONTENT = {...}; const CZ_GLOSSARY = {...};`).
- Bez provádění JavaScriptu z importovaného HTML automaticky zpracovat jazykové varianty EN, ES, DE, FR a úrovně A1–C2.
- Před importem ověřit osm stanic, hlavní a tři doplňující otázky, jazykové podpory a slovní zásobu. Při opětovném nahrání stejného názvu se příslušné téma aktualizuje.
- Vyhledat téma; přepnout jazyk, CEFR, stanice, časovač, světelný režim; zobrazit výzvy, vysvětlivky, slovní zásobu a speaking toolkit.
- Uložit lokální témata do IndexedDB, pokud to prohlížeč dovolí. Pokud ne, aplikace výslovně varuje; import funguje v dočasné paměti.
- Vyexportovat celou aktuální knihovnu jako **samostatný HTML soubor**, který funguje offline bez serveru či přihlášení. To je i bezpečný způsob uchování importů při blokovaném IndexedDB.
- Stáhnout JSON zálohu a později ji obnovit; stáhnout samostatné **studentské HTML jednoho tématu**, které obsahuje pouze vybrané téma a nemá správu importů.

**Učitel nemusí spouštět vývojové etapy ani vyplňovat jednotlivé revize otázky po otázce**, protože tato funkce je soukromá knihovna výukových souborů, nikoli autorizace nového veřejného release.

## Jak se používá

1. Otevřít `Conversation_Lab_Spravce_Temat_9_Aktualnich_Karet.html`. Již obsahuje devět posledních témat; zdrojové soubory se **nespouštějí**, jejich obsah je předem zkonvertován na JSON.
2. Kliknout **Nahrát témata**, označit více `.html` souborů a otevřít. Importovaný soubor se objeví mezi tématy. Při importu nové verze se stejné téma aktualizuje.
3. Vybrat jazyk/CEFR a **Otevřít**. Pro studenty lze stáhnout konkrétní téma pomocí **Pro studenty**.
4. Kliknout **Uložit knihovnu jako HTML**, aby vznikl nový soběstačný soubor obsahující i všechna nově importovaná témata. Je možné vytvořit také **Zálohu JSON**.

## Integrace do AI Studia

- Přidává se výhradně sourozenecká složka `src/conversation-lab-topics/`, **nikoli** `src/conversation-lab/`, jejíž podepsaný inventář musí zůstat přesně 120 souborů. Původní 0.11.0 a E9 nejsou změněny.
- Adresa po bezpečném nasazení do AI Studia: `https://daniel22-dev.github.io/AI-Studio-GHRAB/conversation-lab-topics/`.
- `gate.js` používá stávající skutečné `initialiseAccess()`, `requiredTraining('conversation-lab')`, `assertClbSignedTrainingPolicy()` a `hasAppAccess('conversation-lab')`. Tato kontrola probíhá před načtením kódu správce. Portál obsahuje přímý odkaz, skutečný přístup určuje ověřený CLB-01.
- Úložiště je **lokální pro konkrétní prohlížeč a zařízení** (IndexedDB). To není centrální serverový katalog: jiné zařízení či student neobdrží nová témata automaticky. Ke sdílení slouží exportované studentské HTML, které lze uložit do školního systému / sdílených souborů.
- Pro centrální serverové publikování, trvalé QR odkazy a automatickou synchronizaci mezi zařízeními je potřeba autorizované serverové úložiště nebo samostatný publikační backend. **To tato bezserverová verze nepředstírá.**

## Bezpečnost

- Nikdy neprobíhá `eval`, `Function`, `innerHTML` výukových dat ani vykonání skriptů importované karty; všechna zobrazená pole jsou vložena pomocí `textContent`.
- Importní limity: 3 MB/karta, 250 témat, předem validovaná data CEFR, 8 stanic a 32 otázek/varianta. `CZ_GLOSSARY` je uložen jako data, nikoliv vykonáván jako skript.
- Do veřejných GitHub souborů se **nevkládá žádné z devíti soukromých výukových témat**. Devět karet je předpřipraveno výhradně v lokální přenosné verzi HTML určené autorovi.
- Žádné heslo, GitHub token, Studio token ani identita studenta není zahrnuta do exportu. Žádné nahrané HTML není přenášeno do Cloudflare či GitHub.
- `script-src 'self'` v hostované verzi; offline export obsahuje interní JavaScript, proto mu nesmí být bez rozmyslu přeneseno CSP hostované verze (generátor jej odstraňuje).

## Ověření

- `node --test scripts/test-clb-topic-manager.mjs` – přenositelné syntetické testy do AI Studio repository.
- Lokální `node --test tests/core.test.cjs` – všech 9 skutečných zdrojů, 216 variant / 6 912 otázek, validace a negativní scénáře.
- Chromium DOM testy nad soběstačným HTML: výběr tématu, stanice 1→2, import desátého tématu, HTML záloha a její otevření, export studentské lekce, zobrazení při 390 px; bez JS chyb. Prohlížečové otevření cesty `file://` bylo v automatizačním prostředí zablokováno administrátorem, proto test proběhl načtením stejných HTML bajtů pomocí `set_content`.

## Publikační režim

Nový správce lokálních témat **nenahrazuje** distribuční politiku Conversation Lab 0.12.0 ani není důvodem ke zfalšování vlastnického ES256/P5 potvrzení. Je to funkční soběstačná učitelská aplikace. Nasazení nové Studio stránky je třeba provést standardní cestou candidate → main. Bez spuštěného nasazení nelze tvrdit, že je tento nový webový odkaz živý.
