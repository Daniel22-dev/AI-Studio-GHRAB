# AI Studio GHRAB 0.10.0 - kompletní měření pilotu

## Data a soukromí
- U každé aplikace se evidují spuštění, konzervativní aktivní čas a technické počty výstupů.
- Výstupy mají jen pevný typ a číselné součty: požadováno, úspěch, chyba, zrušení.
- Neukládá se prompt, text testu, hra, e-mail, sloh, jméno ani jiný obsah.

## Správcovská data
- Běžné používání správce se počítá do části Moje místní data.
- V reportu lze místní data zahrnout nebo vyloučit z celku.
- Testovací režim ukládá vývojová data do samostatných klíčů a report je vždy ignoruje.

## Měsíční souhrny
- Prosba se zobrazuje během posledních sedmi dnů měsíce nejvýše jednou denně.
- Stažení samo připomenutí nevypne, protože prohlížeč neumí ověřit odeslání e-mailu. Uživatel po odeslání klikne na potvrzení.
- Souhrny ze dvou zařízení se sečtou; novější souhrn stejného zařízení a měsíce nahradí starší.

## PDF report
- Přímý export barevného a černobílého A4 PDF na jedné straně.
- Hlavička obsahuje skutečné logo Gymnázia Ostrava-Hrabůvka a bránu AI Studia.
- Report obsahuje KPI, tabulku aplikací, automaticky vytvořené poznatky, metodiku a autorství Daniela Baláže.
