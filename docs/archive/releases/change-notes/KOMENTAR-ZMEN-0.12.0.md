# AI Studio GHRAB 0.12.0 — diagnostické hlášení chyby

## Co se změnilo

- Chybový screenshot má ukázat problém v úplném kontextu. Povinná anonymizace byla odstraněna.
- Volitelné začernění zůstává pouze pro nesouvisející osobní údaje, které nejsou potřebné k opravě.
- E-mail správci obsahuje již v těle název aplikace, verzi, popis, postup k zopakování, prostředí a zachycené technické chyby.
- Reporter bezpečně sleduje neošetřené JavaScriptové chyby, odmítnuté Promise a chybové HTTP stavy; neukládá těla požadavků ani generovaný obsah.
- Hlavní screenshot se nástroj pokusí zkopírovat do schránky. Učitel jej vloží do e-mailu pomocí Ctrl+V.
- ZIP obsahuje přehledný soubor `00-PREHLED-HLASENI.html`, který lze po rozbalení ihned otevřít, a lze jej poslat vývojáři k opravě.

## Co správce udělá

1. Z těla e-mailu a vloženého screenshotu získá rychlou představu.
2. Stáhne přiložený ZIP.
3. Při opravě jej předá vývojáři nebo nahraje do ChatGPT bez nutnosti přepisovat chybu.
