# AI Studio GHRAB 0.21.144 – GARP 2.8 N1/N2 hardening

Datum: 2026-10-01

## Důvod vydání

Audit GARP 2.8 identifikoval dva nálezy v produkčním nasazení AI Studia: možnost vložení stránek Studia do cizího rámu (N1) a publikování vývojových HTML stránek v produkčním artefaktu (N2).

## Oprava

- Každá produkční HTML stránka načítá před ostatními skripty nový `frame-guard.js`, který povolí rám pouze ze stejného původu a cizí rám zablokuje ještě před vykreslením UI.
- `frame-guard.js` je součástí povinné offline cache generované service workerem.
- Produkční příprava artefaktu odstraňuje `tests/` a všechny `integration/*.html`, ale ponechává integrační JS/MD/YML soubory.
- Deploy workflow připraví produkční artefakt explicitně před vytvořením release identity.
- Regresní test ověřuje CSP pořadí, frame guard, odstranění vývojových HTML a zachování integračního JavaScriptu.

## Rozsah

Změna řeší pouze nálezy N1 a N2 auditu GARP 2.8. Sdílený kód přístupové brány se nemění.
