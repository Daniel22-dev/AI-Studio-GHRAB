# AI Studio GHRAB 0.21.50

## Oprava zobrazení osobního Top 4 v Pohledu kolegy

- Hvězdička pro přidání/odebrání aplikace z osobního Top 4 se vykresluje každému učiteli na všech kartách.
- Přesun pořadí je dostupný u čtyř aplikací, které má daný učitel kolem brány.
- Stejné chování je viditelné také v Pohledu kolegy.
- Stav testování a změna centrálního provozního semaforu zůstávají pouze správci.

## Příčina předchozího problému

R3 správně změnil zdrojovou logiku, ale ponechal číslo verze 0.21.49. PWA service worker i verzované URL assetů proto používaly stejný cache klíč jako předchozí build a prohlížeč mohl nadále obsluhovat starý app.js, kde byly hvězdičky a přesun Top 4 omezené na správce.

Verze 0.21.50 mění cache namespace i URL assetů a vynutí načtení opraveného runtime.
