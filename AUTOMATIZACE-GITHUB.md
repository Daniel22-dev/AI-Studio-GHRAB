# Automatizace aktualizací AI Studio GHRAB 0.21.23

> Aktuální verze: **0.21.23** · etapa P5

## Pravidelná synchronizace

Workflow Studia se jako pojistka spouští jednou denně ve 3:17 UTC. Nejprve zkouší přímo nasazené `studio-manifest.json` z GitHub Pages. Pokud konkrétní Pages manifest není dosažitelný, ověří veřejný zdrojový repozitář (package + manifestovou šablonu), ale do runtime ponechá poslední známá metadata nasazení. Pouhý snapshot bez ověřeného zdroje je ve Správě označen zvlášť. Offline QA synchronizační report nepřepisuje.

GitHub může plánované workflow v dlouhodobě neaktivním veřejném repozitáři vypnout. Po prázdninové pauze proto zkontrolujte kartu Actions a případně použijte `Run workflow`.

## Okamžitá aktualizace

Po nasazení dílčí aplikace může její repozitář odeslat `repository_dispatch` do Studia. Fine-grained token má mít přístup pouze k repozitáři Studia a musí být uložen jako GitHub secret `AI_STUDIO_DISPATCH_TOKEN`. Nikdy nepatří do HTML, JavaScriptu, manifestu ani dokumentace.

## Ověření vydání

1. V Actions musí projít synchronizace, test a build.
2. Ve Správě zkontrolujte počet ověřených nasazení, ověřených GitHub zdrojů a položek pouze na snapshotu.
3. Spusťte Kontrolu Studia.
4. V anonymním okně ověřte výchozí uzamčení.
5. Se správcovským oprávněním ověřte odemčení a administraci.

## Distribuce GHRAB AI Core

Workflow `distribute-ai-core.yml` je standardně dry-run. Ostrý `repository_dispatch` vyžaduje secret `GHRAB_CORE_SYNC_TOKEN`; spotřebitelský repozitář musí před commitem ověřit SHA-256, konformitní sadu a vlastní testy.
