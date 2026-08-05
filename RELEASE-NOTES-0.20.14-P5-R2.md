# AI Studio GHRAB 0.20.14 — P5 R2

Datum: 5. srpna 2026

## Změny

- P5 R2 runtime audit spouští skutečné portálové UI přes lokální HTTP.
- Produkční reportér je povinně ověřován mimo testovací strom.
- Lockfile a CI používají explicitní veřejný npm registr.

## Certifikační stav

- Projektové testy: PASS.
- Runtime přístupnost a reflow nad spuštěnou aplikací: PASS.
- Exact axe-core 4.12.1: povinný a blokující v GitHub CI; lokálně v pracovním prostředí nebyl balík dostupný.
- GitHub Pages: zatím nenahráno.
- Školní server: připraven, nepřipojen.
