# AI Studio GHRAB 0.21.21

Datum: 12. 8. 2026

## Showroom: věrný LUDUS a vyšší projekční kvalita

- Záběr LUDUSu kolem 00:50 byl nahrazen věrnou kompozicí podle aktuálního `Ludus/src/index.html` ve verzi 1.16.11. Používá skutečný hero text „Postav hru, aniž bys psal kód.“, kroky Mechanika / Svět / Obsah a skutečný úvodní krok „Vyber mechaniku“.
- Odstraněna byla předchozí zjednodušená rekonstrukce LUDUSu, která neodpovídala reálnému rozhraní aplikace.
- Opravovaný úsek LUDUSu byl nahrazen samostatně podle aktuálního zdroje; výsledný master byl poté jednou finálně přepočítán do 2560×1440 s Lanczos škálováním a mírným doostřením, bez řetězení dalších meziverzí.
- Finální showroom je exportován v 2560×1440, 30 fps, H.264. Obrazový tok je přibližně 4,46 Mb/s a soubor má přibližně 53,5 MB; zůstává tak pod 60MB limitem release gate a současně má vyšší datový rozpočet pro projekci v učebně.
- Soundtrack zůstává v původním souvislém pořadí bez remixu.

## Poznámka ke kvalitě

Převod starších 1080p záběrů do 1440p nemůže obnovit detail, který už byl ztracen v předchozí kompresi. Nový LUDUS je ostrý zdrojový render; pro skutečně nativní 1440p ostrost všech osmi aplikací by bylo nutné znovu vyrenderovat nebo nasnímat také jejich původní UI z čistých zdrojů.
