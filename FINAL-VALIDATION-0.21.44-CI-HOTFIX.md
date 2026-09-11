# AI Studio GHRAB 0.21.44 — finální validace CI hotfixu

Datum: 2026-09-06

## Důvod opravy

GitHub Actions release gate selhal pouze na `budget.distBytes`:

- naměřeno v CI: 2 252 019 B
- limit: 2 250 000 B
- rozdíl: +2 019 B
- lazy media: PASS
- 4K film: PASS v limitu jednotlivého lazy-media souboru

## Oprava

Původní performance budget nebyl zvýšen. `scripts/build.mjs` kompaktně serializuje další strojově čitelné runtime JSON konfigurace pouze v distribučním buildu. Zdrojové soubory ani jejich datový obsah se nemění.

## Ověření po opravě

- `npm run build`: PASS
- `npm run qa:quality`: 188/188 PASS
- `budget.distBytes`: 2 245 818 B <= 2 250 000 B
- `npm test`: PASS
- GARP security regressions: 19/19 PASS
- security regressions: 16/16 PASS
- audit regressions: 50/50 PASS
- `npm run verify:platform`: 203/203 PASS
- Maturita Desk external-launcher regression: PASS
- `npm run build:school-server`: PASS
- quality po school-server buildu: 188/188 PASS
- reporter static/node regression: 56 PASS / 0 FAIL
- reporter browser část lokálně: NOT_READY kvůli spravované Chromium URLBlocklist politice v pracovním prostředí; není deklarována jako PASS a GitHub CI ji provádí ve svém prostředí.

## Verze

Verze zůstává `0.21.44`, protože předchozí kandidát nebyl nasazen — CI jej zastavilo před deploymentem.
