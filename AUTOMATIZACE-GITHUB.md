# Automatizace aktualizací AI Studio GHRAB 0.20.15

> Aktuální verze: **0.20.15** · etapa P3

## Pravidelná synchronizace

Workflow Studia se jako pojistka spouští jednou denně ve 3:17 UTC. Načte veřejné manifesty, ověří jejich schema, verzi, HTTPS adresy a pilotní status, provede testy a nasadí pouze ověřený build.

GitHub může plánované workflow v dlouhodobě neaktivním veřejném repozitáři vypnout. Po prázdninové pauze proto zkontrolujte kartu Actions a případně použijte `Run workflow`.

## Okamžitá aktualizace

Po nasazení dílčí aplikace může její repozitář odeslat `repository_dispatch` do Studia. Fine-grained token má mít přístup pouze k repozitáři Studia a musí být uložen jako GitHub secret `AI_STUDIO_DISPATCH_TOKEN`. Nikdy nepatří do HTML, JavaScriptu, manifestu ani dokumentace.

## Ověření vydání

1. V Actions musí projít synchronizace, test a build.
2. Ve Správě zkontrolujte živé manifesty a fallbacky.
3. Spusťte Kontrolu Studia.
4. V anonymním okně ověřte výchozí uzamčení.
5. Se správcovským oprávněním ověřte odemčení a administraci.

## Distribuce GHRAB AI Core

Workflow `distribute-ai-core.yml` je standardně dry-run. Ostrý `repository_dispatch` vyžaduje secret `GHRAB_CORE_SYNC_TOKEN`; spotřebitelský repozitář musí před commitem ověřit SHA-256, konformitní sadu a vlastní testy.
