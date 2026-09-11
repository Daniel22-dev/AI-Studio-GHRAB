# AI Studio GHRAB 0.21.24

Datum: 13. 8. 2026

## Hotfix reportéru: spolehlivé screenshoty

- Opraven závod při inicializaci screen capture: reportér už nečeká bez omezení na `loadedmetadata`, ale čeká na skutečně dostupný frame s časovým limitem.
- Tlačítko **Pořídit snímek** už při neaktivním nebo ukončeném streamu neselže potichu; uživatel dostane srozumitelný stav.
- Během pořízení se zobrazuje „Pořizuji snímek…“, po úspěchu „Snímek uložen ✓“ a počitadlo snímků se aktualizuje v plovoucím panelu.
- Opraven CSS selektor skrytého `<video>` prvku, který je technicky vložen přímo do `body`.
- Regresní test nově simuluje opožděné zpřístupnění rozměrů videa bez nové události `loadedmetadata` a ověřuje obě tlačítka pro pořízení snímku.
- Ostatní funkce AI Studia, oprávnění, registry a datový model se nemění.
