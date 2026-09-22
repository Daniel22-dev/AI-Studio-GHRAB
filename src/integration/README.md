# Ochrana samostatných aplikací bez serveru

## Aktuální model

Ochranná vrstva je součástí federovaného přístupového modelu všech devíti aplikací AI Studia.
Konkrétní nasazené verze se v tomto dokumentu záměrně neudržují; autoritativní stav vede
aplikační registr, release-wave a release gate.

- Generátor interaktivních testů — ID `generator`
- Diferenciátor — ID `differentiator`
- Hodnotitel maturitních slohů — ID `essay-evaluator`
- Korespondenční asistent — ID `correspondence`
- LUDUS — ID `ludus`
- ACTIVA — ID `activity-builder`
- SORTIO — ID `sortio`
- Lesson Hub — ID `lesson-hub`
- Maturita Desk — ID `maturita-desk`

Tento soubor je vývojářská dokumentace v repozitáři. Není součástí běžného provozního
workflow Správy AI Studia.

## Princip pro budoucí aplikace

1. Stránka začíná ve stavu kontroly přístupu.
2. Vlastní aplikační skripty se nespustí před ověřením.
3. Bootstrap načte lokální deployment kontrakt nebo explicitní `__GHRAB_STUDIO_URL__`
   a ze `studioBaseUrl` odvodí cestu k centrálnímu access guardu.
4. Centrální modul načte veřejný klíč, politiku a revokační seznam.
5. Ověří podpis ECDSA P-256, vydavatele, publikum, časovou platnost, JTI, roli a ID aplikace.
6. Teprve při úspěchu se spustí vlastní aplikace.
7. Při zamítnutí nebo chybě konfigurace se zobrazí zamykací obrazovka.

Veřejný ověřovací klíč je bezpečné publikovat. Soukromý podpisový klíč ani osobní
přístupové soubory nesmějí být v žádném veřejném repozitáři.

## Uložení materiálu zpět do AI Studia

Pro jednotné tlačítko **Uložit do AI Studia** použijte `save-to-studio.js`.
Serverless a budoucí serverový tok je popsán v `SAVE-TO-STUDIO.md`.
Studio přijímá Bridge v2 handoff s cílem `ai-studio` na stránce Materiály.
