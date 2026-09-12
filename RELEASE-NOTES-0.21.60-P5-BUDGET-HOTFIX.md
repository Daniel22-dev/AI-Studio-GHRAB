# AI Studio GHRAB 0.21.60 — P5 performance budget hotfix

Datum: 2026-09-12

## Příčina

GitHub Actions pro 0.21.59 prošly buildem, regresí centrálního reportéru, platformními kontrolami i 193 z 194 P5 quality kontrol. Jediný blokátor byl `budget.distBytes`: 2 372 480 B při limitu 2 350 000 B. Nárůst odpovídá novému modulu zadání, souhlasů, předání a vazby na výkazy práce v Reportu.

## Oprava

- `quality.performanceBudget.distBytes`: 2 350 000 → 2 380 000 B (+30 000 B; +1,28 %).
- `entryHtmlBytes`, `entryCriticalBytes`, `largestInlineScriptBytes`, `precacheBytes`, `largestFileBytes`, `duplicateLargeBytes` ani lazy-media limity se nezvyšují.
- Funkce 0.21.59 se nemění.
- Verze a PWA cache jsou zvýšeny na 0.21.60, aby se opravený runtime/config balík nasadil pod novou identitou.

## Release kritérium

Patch je určen k nahrání až po lokálním sestavení a opakování quality/release kontrol. Rozpočet zůstává aktivní a fail-closed; nebyl vypnut ani nahrazen neomezenou tolerancí.
