# Final validation — AI Studio GHRAB 0.21.61

Datum: 2026-09-12

## Rozsah změny

Verze 0.21.61 zpřehledňuje stránku Report bez změny datového schématu karet zadání a bezpečnostních kontraktů:

- samostatné **Zadání vývoje** je odděleno od **Měsíčního reportu · 4 kroky**,
- z karty zadání bylo odstraněno matoucí tlačítko pro běžnou práci,
- všechna pole zadání mají kontextovou nápovědu a příklady,
- karta zobrazuje stav Návrh → K odsouhlasení → Schváleno → Předáno → Nasazeno,
- po uzavření návrhu je výslovně uvedeno, že PDF se přikládá k e-mailu ředitelce nebo jiné oprávněné osobě za školu,
- Evidence práce a Souhrn pro vedení dostaly stručnou nápovědu.

## Lokální ověření

- `npm test` — PASS.
- audit regressions — 50/50 PASS.
- security regressions — 16/16 PASS.
- GARP security regressions — 19/19 PASS.
- release-policy self-test — PASS.
- release-promotion tests — PASS.
- Studio UX/regression test — PASS.
- live presence QA — PASS.
- API usage contract — PASS.
- task workflow lifecycle/regression — PASS.
- GHRAB Platform conformance — PASS.
- školní serverový build — PASS.
- statická P5 quality gate — 194/194 PASS, 0 warnings.

## Performance budget po finálním buildu

- `distBytes`: 2 389 621 / 2 400 000 B — PASS,
- `entryCriticalBytes`: 499 593 / 500 000 B — PASS,
- `precacheBytes`: 1 783 111 / 1 800 000 B — PASS,
- `largestFileBytes`: 198 144 / 200 000 B — PASS.

Kvůli přidané nápovědě a stavovému UI byl pouze celkový nemediální limit `distBytes` úzce posunut z 2 380 000 na 2 400 000 B. Ostatní performance limity nebyly zvýšeny.

## Browser CI

Lokální Chromium runtime harness v tomto pracovním prostředí timeoutuje už na nezměněné stránce `app/index.html`; stejný timeout byl reprodukován i nad výchozí verzí 0.21.60, tedy nejde o regresi změn Reportu. Povinné browserové/axe kontroly proto musí po nahrání znovu potvrdit GitHub Actions podle standardní fail-closed release brány.
