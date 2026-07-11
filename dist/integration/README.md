# Ochrana samostatných aplikací bez serveru

## Stav ve verzi 0.6.1

Ochranná vrstva je již integrována v těchto vydáních:

- Generátor interaktivních testů 7.0.6 — ID `generator`,
- Diferenciátor 1.0.3 — ID `differentiator`,
- LUDUS 1.14.3 — ID `ludus`,
- Korespondenční asistent 4.0.3 — ID `correspondence`.

Přímé otevření jejich veřejných adres proto používá stejné podepsané oprávnění jako spuštění z AI Studia.

## Princip pro budoucí aplikace

1. Stránka začíná ve stavu `data-ghrab-access="checking"`.
2. Vlastní aplikační skripty mají inertní typ `application/ghrab-protected`.
3. Bootstrap načte `/AI-Studio-GHRAB/access/app-guard.js`.
4. Centrální modul načte veřejný klíč, politiku a revokační seznam.
5. Ověří podpis ECDSA P-256, vydavatele, publikum, časovou platnost, JTI, roli a ID aplikace.
6. Teprve při úspěchu se aplikační skripty převedou na spustitelné.
7. Při zamítnutí nebo chybě konfigurace se původní rozhraní odstraní a zobrazí se zamykací obrazovka.

Veřejný ověřovací klíč je bezpečné publikovat. Soukromý podpisový klíč ani osobní přístupové soubory nesmějí být v žádném veřejném repozitáři.

## Důležité omezení

Bezserverové oprávnění je profesionální přechodová kontrola, nikoli náhrada školního přihlášení. Nelze jím bezpečně ověřit totožnost osoby, zabránit předání platného souboru ani znemožnit technicky zkušenému uživateli stáhnout a upravit veřejný statický kód.
