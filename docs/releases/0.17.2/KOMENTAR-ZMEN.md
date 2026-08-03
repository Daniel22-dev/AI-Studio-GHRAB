# AI Studio GHRAB v0.17.2 — zmenšení nadměrného loga Hodnotitele

## Problém
Hodnotitel maturitních slohů má v dolní informační části velké školní logo. Při otevření aplikace uvnitř AI Studia zabíralo nepřiměřenou část obrazovky a odvádělo pozornost od pracovního obsahu.

## Řešení
- AI Studio po načtení Hodnotitele rozpozná největší logo v dolní části aplikace.
- Logo dostane kompaktní rozměr přibližně 104–152 px podle velikosti obrazovky.
- Zmenší se také jeho obalový blok, aby po původní velikosti nezůstalo prázdné místo.
- Kontrola běží i po dynamických změnách stránky, takže funguje také po přechodu mezi kroky aplikace.

## Rozsah
Úprava je záměrně omezena pouze na aplikaci `essay-evaluator` otevřenou uvnitř pracovního prostoru Studia. Samostatně otevřený Hodnotitel ani ostatní aplikace se nemění.
