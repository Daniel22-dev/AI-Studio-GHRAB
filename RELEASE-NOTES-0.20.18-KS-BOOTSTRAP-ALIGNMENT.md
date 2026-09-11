# AI Studio GHRAB 0.20.18 — zarovnání opravy KS embedded bootstrapu

Datum: 9. 8. 2026

## Co se změnilo

Produkční cesta AI Studio → vložený Korespondenční asistent ukázala, že obecná obrazovka „Centrální přístupová služba není dostupná“ nebyla způsobena přístupovou službou. KS 5.9.20 po aktivaci centrální platformní runtime vrstvy spadl na TDZ chybě `Cannot access 'geminiModel' before initialization` a nedosáhl `ksAppReady`.

Skutečná runtime oprava je ve verzi KS 5.9.21. AI Studio 0.20.18 aktualizuje registry a cache metadata na tuto verzi, aby pracovní prostor, reporty a platformní metadata odpovídaly nasazené satelitní aplikaci.

Přístupové tokeny, oprávnění a platformní kontrakt se nemění.
