# AI Studio GHRAB 0.21.4

Bezpečnostní hotfix po GitHub Actions. Offline test z 0.21.3 už správně prošel s 8/8 aplikacemi, release ale zastavila XSS regresní brána kvůli nárůstu `innerHTML` sinků z povolených 12 na 14.

Knihovna Materiály nyní vytváří prázdné, načítací a chybové stavy bezpečně přes DOM API a `textContent`. Celkový počet evidovaných `innerHTML` sinků klesl na 8 a baseline byl zpřísněn na 8.
