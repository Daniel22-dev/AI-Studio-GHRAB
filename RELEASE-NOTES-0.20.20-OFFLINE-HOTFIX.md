# AI Studio GHRAB 0.20.20 — hotfix offline startu

Datum: 2026-08-09

## Důvod vydání

GitHub Actions u 0.20.19 správně odhalily regresi v browserovém testu offline startu. Aplikace se načetla z PWA cache, ale karty aplikací se nevykreslily, protože registry načítané s `cache: 'no-store'` service worker úplně obcházely.

## Oprava

- statické same-origin požadavky s `cache: 'no-store'` jsou obslouženy strategií network-first s cache fallbackem,
- navigace si zachovává vlastní offline fallback,
- runtime API, auth, session, health a `config/deployment.json` zůstávají mimo service worker,
- přidána regresní kontrola zdrojového service workeru proti návratu původní chyby,
- existující `scripts/test-offline-start-browser.mjs` zůstává koncovou E2E kontrolou 8 online + 8 offline karet.

## Rozsah

Hotfix nemění registry aplikací, přístupové tokeny, AI Core ani platformní kontrakt. Jde pouze o opravu PWA fetch strategie a související release metadata/test.
