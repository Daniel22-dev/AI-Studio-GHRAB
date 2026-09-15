# AI Studio GHRAB 0.21.74 — manual release-wave reconciliation

Datum: 2026-09-15

## Změna

- Generátor interaktivních testů je explicitně ručně povýšen v `release-wave.json` z `7.1.25` na aktuální `7.1.28`.
- `release-promotion-policy.json` se nemění: Generátor **není** zařazen do auto-patch režimu.
- Diferenciátor `1.3.46`, Lesson Hub `1.2.22` a Maturita Desk `1.0.3` zůstávají beze změny a nadále používají manual režim.
- AI Akademie není součástí současné devítiaplikační release-wave a tímto releasem se do ní nepřidává.
- Performance Pack A–D z 0.21.70–0.21.73 se funkčně nemění.

## Důvod

GitHub ecosystem gate správně zastavil 0.21.73, protože živý Generátor hlásil `7.1.28`, zatímco release-wave byla stále zamčena na `7.1.25`. Tento release provádí vědomou **manual** aktualizaci baseline bez oslabení fail-closed gate a bez předčasného auto-patch enrollmentu.

## Ověření zdroje

Aktuální `main` repozitáře `Daniel22-dev/generator-testu` deklaruje verzi `7.1.28` a jeho Studio manifest template zachovává GHRAB Platform `1.1.2`, required range `>=1.1.2 <2.0.0`, storage namespace `ghrab.generator.` a cache identity odvozenou z verze. Skutečné deployment/repository verification zůstává úkolem GitHub `npm run sync`; lokální snapshot není vydáván za live ověření.
