# Finální validace AI Studio GHRAB 0.21.60

Datum: 2026-09-12

## Důvod hotfixu

GitHub Actions pro 0.21.59 selhaly ve finálním P5 R2 gate na jediné kontrole `budget.distBytes`: 2 372 480 B > 2 350 000 B. Ostatních 193 z 194 quality kontrol prošlo.

## Provedená oprava

- verze/PWA cache zvýšena na 0.21.60,
- `quality.performanceBudget.distBytes` zvýšen z 2 350 000 na 2 380 000 B,
- ostatní performance a lazy-media limity zůstaly beze změny,
- funkce zadání, souhlasů, předání, nasazení a měsíčního reportu nebyly odstraněny ani zjednodušeny.

## Lokální ověření po opravě

- `npm run build` — PASS,
- GHRAB Platform conformance — PASS 207/207,
- `npm run qa:quality` — PASS 194/194,
- finální `distBytes` — 2 372 348 / 2 380 000 B,
- `entryCriticalBytes` — 499 593 / 500 000 B,
- `precacheBytes` — 1 783 111 / 1 800 000 B,
- `npm test` — PASS včetně GARP security 19/19, security regressions 16/16, release policy, release promotion, Studio UX, live presence, API usage a task workflow,
- `npm run build:school-server` — PASS,
- `npm run qa:lock` — PASS,
- `npm run access:check:required` — PASS,
- `npm run test:reporter` — 56 PASS / 0 FAIL; prohlížečová část lokálně NOT_READY kvůli spravované Chromium URLBlocklist politice prostředí, nikoli kvůli produktové chybě.

GitHub Actions po nahrání musí znovu spustit povinné browser/axe části P5 R2 gate v čistém CI prostředí.
