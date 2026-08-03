# Ochrana samostatných aplikací bez serveru

## Stav ve verzi 0.20.5

Ochranná vrstva je integrována v těchto vydáních:

- Generátor interaktivních testů 7.1.4 — ID `generator`,
- Diferenciátor 1.3.3 — ID `differentiator`,
- Hodnotitel maturitních slohů 1.5.2 — ID `essay-evaluator`,
- LUDUS 1.16.3 — ID `ludus`,
- Korespondenční asistent 5.9.3 — ID `correspondence`,
- ACTIVA 0.5.0 — ID `activity-builder`,
- SORTIO 1.0.2 — ID `sortio`,
- Lesson Hub 1.2.0 — ID `lesson-hub`.

Přímé otevření jejich veřejných adres používá stejné podepsané oprávnění jako spuštění z AI Studia.

## Princip pro budoucí aplikace

1. Stránka začíná ve stavu kontroly přístupu.
2. Vlastní aplikační skripty se nespustí před ověřením.
3. Bootstrap načte `/AI-Studio-GHRAB/access/app-guard.js`.
4. Centrální modul načte veřejný klíč, politiku a revokační seznam.
5. Ověří podpis ECDSA P-256, vydavatele, publikum, časovou platnost, JTI, roli a ID aplikace.
6. Teprve při úspěchu se spustí vlastní aplikace.
7. Při zamítnutí nebo chybě konfigurace se zobrazí zamykací obrazovka.

Veřejný ověřovací klíč je bezpečné publikovat. Soukromý podpisový klíč ani osobní přístupové soubory nesmějí být v žádném veřejném repozitáři.
