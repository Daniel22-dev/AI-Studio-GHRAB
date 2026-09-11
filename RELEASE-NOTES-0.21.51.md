# AI Studio GHRAB 0.21.51 - dvoustránkový reporting pro vedení

Datum: 11. 9. 2026

## Co se mění

- Souhrnný report generuje jeden skutečný dvoustránkový PDF dokument A4.
- Strana 1 zachovává dosavadní anonymní provozní statistiky používání aplikací.
- Strana 2 přidává práci garanta, školení a podporu, mimořádné úkoly, přímé AI náklady, klíčové výsledky, rizika, potřebná rozhodnutí vedení a priority.
- Správce může ve Studiu vést lokální pracovní evidenci po jednotlivých záznamech a samostatný manažerský souhrn pro dané období.
- Soukromá poznámka pracovního záznamu zůstává pouze lokálně a není součástí PDF ani anonymních JSON/CSV exportů.
- Nezadané náklady jsou v reportu označeny jako „Neuvedeno“. Nulový či neplatný čas pracovního záznamu se neuloží.

## Výkonový rozpočet

Funkce přidává přibližně 34 kB zdrojového JavaScriptu/HTML/CSS nad předchozí build a překročila jediný dosavadní limit `distBytes` 2,25 MB; ostatní rozpočty zůstaly splněné. Celkový nemediální limit je proto explicitně posunut na 2,30 MB (cca +2,2 %), nikoli vypnut. `entryCriticalBytes`, precache, největší soubor i duplicitní data zůstávají pod původními limity.

## Serverless a budoucí školní server

Aktuální GitHub Pages režim zůstává po stránce anonymní provozní telemetrie stejný: kolega stáhne svůj měsíční anonymní JSON a správce jej importuje. Nový report pouze sjednocuje finální výstup pro vedení.

Po skutečném připojení školního serveru je připraven cílový workflow, ve kterém se anonymní provozní data centralizují automaticky. Kolegové pak nebudou muset měsíční soubory posílat a správce pouze vygeneruje stejný dvoustránkový PDF report. Tato automatická centralizace není v 0.21.51 v GitHub Pages režimu aktivní.

## Co tato verze nemění

- Nemění přístupový model ani GARP bezpečnostní logiku.
- Nezavádí sledování online uživatelů ani právě otevřené aplikace; to je samostatný navazující krok.
- Nemění obsah anonymního JSON/CSV provozního exportu a nepřidává do něj pracovní evidenci garanta.
