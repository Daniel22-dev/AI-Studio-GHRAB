# QA report — AI Studio GHRAB 0.2.1

## Rozsah opravy

- adaptivní výkon animací,
- ruční přepínač režimu pohybu,
- fullscreen ovládání,
- mobilní optimalizace,
- kompatibilita s nastavením `prefers-reduced-motion`.

## Režimy animací

- **Automatický:** plný režim na výkonném desktopu, úsporný režim na telefonu nebo slabším zařízení, vypnutí při systémovém požadavku na omezení pohybu.
- **Plný:** portál, halo a hvězdné pozadí.
- **Úsporný:** bez canvasového hvězdného pole, bez sekundárního halo a bez světelného paprsku.
- **Vypnutý:** statické rozhraní bez animací.

## Fullscreen

- Standardní Fullscreen API a WebKit varianta.
- Při nepodporovaném API se zobrazí praktická informace o PWA/F11.
- Stav tlačítka se synchronizuje s událostí `fullscreenchange`.

## Ověření

- `node --check` pro JavaScript,
- interní testovací skript,
- produkční build,
- kontrola sestavení všech stránek a produkčních souborů.
