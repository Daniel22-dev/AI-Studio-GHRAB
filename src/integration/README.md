# Ochrana samostatných aplikací bez serveru

## Aktuální model

Ochranná vrstva je součástí federovaného přístupového modelu všech devíti aplikací AI Studia.
Konkrétní nasazené verze se v tomto dokumentu záměrně neudržují; autoritativní stav vede
aplikační registr, release-wave a release gate.

- Generátor interaktivních testů 7.1.53 — ID `generator`,
- Diferenciátor 1.3.49 — ID `differentiator`,
- Hodnotitel maturitních slohů 1.5.29 — ID `essay-evaluator`,
- LUDUS 1.16.29 — ID `ludus`,
- Korespondenční asistent 5.10.31 — ID `correspondence`,
- ACTIVA 0.5.30 — ID `activity-builder`,
- SORTIO 1.1.22 — ID `sortio`,
- Lesson Hub 1.2.26 — ID `lesson-hub`.

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
