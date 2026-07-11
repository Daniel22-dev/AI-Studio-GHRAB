# Ochrana samostatných aplikací bez serveru

## Stav ve verzi 0.6.2

Ochranná vrstva je integrována v těchto vydáních:

- Generátor interaktivních testů 7.0.6 — ID `generator`,
- Diferenciátor 1.0.3 — ID `differentiator`,
- Hodnotitel maturitních slohů 1.3.1 — ID `essay-evaluator`,
- LUDUS 1.14.3 — ID `ludus`,
- Korespondenční asistent 4.0.3 — ID `correspondence`.

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
