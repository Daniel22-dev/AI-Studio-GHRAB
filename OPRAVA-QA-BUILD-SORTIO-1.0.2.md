# Oprava qa-build po aktualizaci SORTIO 1.0.2

## Příčina

Synchronizace AI Studia správně načetla živý manifest SORTIO ve verzi 1.0.2, ale regresní test stále vyžadoval přesně verzi 1.0.1. `npm test` proto zastavil celý krok `Run GHRAB QA release gate`, přestože manifest byl platný.

## Oprava

- minimální podporovaná verze SORTIO je nyní 1.0.2,
- test přijme také budoucí vyšší verze místo pevného porovnání jediné verze,
- fallback a výchozí generovaný registr obsahují SORTIO 1.0.2,
- vizuální QA opakuje dočasné chyby pořizování screenshotu Chromiem,
- workflow má explicitně nastaveny tři pokusy pro vizuální běh i screenshot.

## Nahrání

Nahrajte celý obsah tohoto balíku do kořene repozitáře `AI-Studio-GHRAB` a potvrďte přepsání souborů. Složku `dist` není nutné nahrávat; GitHub Actions ji vytvoří znovu.

Po commitu stačí počkat na automaticky spuštěný workflow. Další ruční `Run workflow` není potřeba, pokud automatický běh skončí zeleně.
