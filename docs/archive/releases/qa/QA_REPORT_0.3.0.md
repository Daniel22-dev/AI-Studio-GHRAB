# QA report — AI Studio GHRAB 0.3.0

Datum kontroly: 10. 7. 2026

## Kontrolované balíčky

- AI Studio GHRAB 0.3.0
- Generátor interaktivních testů 7.0.5
- Diferenciátor 1.0.2
- Korespondenční asistent 4.0.2
- LUDUS 1.14.2

## Výsledky

### AI Studio

Příkazy:

```bash
npm run sync:offline
npm test
```

Výsledek:

- registr obsahuje 4 aplikace,
- offline fallback byl úspěšně vytvořen,
- JSON schémata jsou platná,
- všechny JavaScriptové soubory prošly syntaktickou kontrolou,
- HTML nemá duplicitní ID,
- nebyly nalezeny známé vzory API klíčů ani privátních klíčů,
- build obsahuje Pracovní tok, Report, Bridge, Knihovnu, Pilot, Bezpečnost a Demo,
- výsledek: **prošlo bez chyby**.

### Generátor 7.0.5

Příkaz:

```bash
npm test
```

Výsledek:

- verze synchronizována napříč projektem,
- produkční invariants splněny,
- zdrojová struktura: 11 split modulů, původní názvy pouze jako neaktivní migrační tombstones,
- kontrola citlivých údajů prošla,
- ESLint prošel,
- build z 29 JavaScriptových modulů prošel,
- workflow audit: **28 PASS / 0 FAIL**,
- testovací matice zahrnovala 576 režimových kombinací, 703 dvojic typů a 315 kombinací CEFR.

Poznámka: testovací prostředí bez sítě správně použilo vestavěný přístupový seznam.

### Diferenciátor 1.0.2

- build prošel,
- bez nativních `prompt/confirm` dialogů,
- bezpečnostní meta pravidla přítomna,
- start bez runtime chyb,
- žádná duplicitní ID,
- interní testy: **57/57**.

### Korespondenční asistent 4.0.2

- build prošel,
- bez nativních `prompt/confirm` dialogů,
- bezpečnostní meta pravidla přítomna,
- start bez runtime chyb,
- žádná duplicitní ID,
- interní testy: **17/17**.

### LUDUS 1.14.2

- validace manifestu prošla,
- zkontrolováno 15 záznamů enginů,
- syntakticky zkontrolováno 12 HTML enginů,
- verze a PWA cache odpovídají 1.14.2,
- build dílny a enginů prošel.

## Bezpečnostní poznámky

- Handoff je lokální, nešifrovaný a určený jen pro anonymní nebo veřejný obsah.
- Obsah materiálu se nezapisuje do pilotních událostí.
- Na sdíleném počítači je nutné po práci vymazat místní pracovní prostor.
- Výsledky a materiály nejsou synchronizovány mezi zařízeními.
- Serverless verze nemá centrální identitu, databázi ani bezpečnou serverovou úschovu společného API klíče.

## Závěr

Vydání 0.3.0 je připraveno pro GitHub Pages a řízený školní pilot. Profesionální sdílená knihovna, role uživatelů, centrální analytika a společný API klíč zůstávají záměrně vyhrazeny pro pozdější serverovou etapu.
