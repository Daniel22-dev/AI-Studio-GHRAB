# Ochrana samostatných aplikací bez serveru

## Aktuální stav registru

Ochranná vrstva je integrována v těchto vydáních:

- Generátor interaktivních testů 7.1.13 — ID `generator`,
- Diferenciátor 1.3.13 — ID `differentiator`,
- Hodnotitel maturitních slohů 1.5.11 — ID `essay-evaluator`,
- LUDUS 1.16.13 — ID `ludus`,
- Korespondenční asistent 5.10.3 — ID `correspondence`,
- ACTIVA 0.5.10 — ID `activity-builder`,
- SORTIO 1.0.12 — ID `sortio`,
- Lesson Hub 1.2.9 — ID `lesson-hub`.

Přímé otevření jejich veřejných adres používá stejné podepsané oprávnění jako spuštění z AI Studia.

## Princip pro budoucí aplikace

1. Stránka začíná ve stavu kontroly přístupu.
2. Vlastní aplikační skripty se nespustí před ověřením.
3. Bootstrap načte lokální deployment kontrakt (nebo explicitní `__GHRAB_STUDIO_URL__`) a z `studioBaseUrl` odvodí cestu k `access/app-guard.js`; URL není natvrdo svázaná s GitHub Pages.
4. Centrální modul načte veřejný klíč, politiku a revokační seznam.
5. Ověří podpis ECDSA P-256, vydavatele, publikum, časovou platnost, JTI, roli a ID aplikace.
6. Teprve při úspěchu se spustí vlastní aplikace.
7. Při zamítnutí nebo chybě konfigurace se zobrazí zamykací obrazovka.

Veřejný ověřovací klíč je bezpečné publikovat. Soukromý podpisový klíč ani osobní přístupové soubory nesmějí být v žádném veřejném repozitáři.

## Uložení materiálu zpět do AI Studia

Pro jednotné tlačítko **Uložit do AI Studia** použijte `save-to-studio.js`. Přesný serverless a budoucí serverový tok je popsán v `SAVE-TO-STUDIO.md`. Studio od verze 0.21.6 přijímá Bridge v2 handoff s cílem `ai-studio` na stránce Materiály.
