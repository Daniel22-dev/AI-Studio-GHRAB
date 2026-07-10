# Automatizace aktualizací AI Studio GHRAB 0.5.1

## Denní bezpečnostní synchronizace

Workflow Studia se jako pojistka spouští jednou denně v 05:17 UTC. Načte veřejné manifesty, ověří jejich schema, verzi, HTTPS adresy a pilotní status a následně provede testy a nasazení.

GitHub může v neaktivním veřejném repozitáři plánované workflow po 60 dnech bez aktivity automaticky vypnout. Po delší prázdninové pauze proto otevřete `Actions`, workflow znovu povolte a spusťte `Run workflow`.

## Okamžitá aktualizace přes repository_dispatch

Doporučený provoz nespoléhá jen na plán. Po nasazení Generátoru, LUDUSu nebo Školních aplikací odešle zdrojový repozitář událost `repository_dispatch` do Studia.

### Fine-grained token

1. GitHub: `Settings → Developer settings → Personal access tokens → Fine-grained tokens`.
2. Přístup pouze k repozitáři `AI-Studio-GHRAB`.
3. Oprávnění repozitáře **Contents: Read and write**.
4. Token uložte ve zdrojových repozitářích jako secret `AI_STUDIO_DISPATCH_TOKEN`.
5. Token nikdy nevkládejte do HTML, JavaScriptu, README ani manifestu.

## Ověření

1. Spusťte deploy jedné dílčí aplikace.
2. V `AI-Studio-GHRAB → Actions` se musí objevit běh vyvolaný `repository_dispatch`.
3. Ve Studiu otevřete **Automatizace** a zkontrolujte čas synchronizace i režim `live/mixed/fallback`.

Pokud token není nastaven, denní synchronizace zůstane záložní cestou.
