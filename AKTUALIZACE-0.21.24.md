# Aktualizace 0.21.24

## Co se změnilo

Opraveno pořizování screenshotů v tlačítku **Nahlásit chybu**. Po povolení sdílení obrazovky se reportér už nemůže zaseknout čekáním na událost `loadedmetadata`, která mohla proběhnout dříve, než na ni kód začal čekat. Nově se ověřuje skutečně dostupný obrazový frame s časovým limitem.

Kliknutí na **Pořídit snímek** má nyní jasnou odezvu: během zpracování se zobrazí „Pořizuji snímek…“ a po úspěchu „Snímek uložen ✓“. Pokud stream mezitím skončil nebo není aktivní, reportér už neudělá tichý návrat bez vysvětlení.

Současně byl opraven CSS selektor skrytého video prvku používaného pro screen capture. Regresní test nově pokrývá opožděné zpřístupnění rozměrů videa a obě cesty pořízení snímku — přímo v dialogu i z plovoucího panelu.
