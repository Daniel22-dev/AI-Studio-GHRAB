# Automatizace aktualizací AI Studio GHRAB 0.21.58

> Aktuální verze: **0.21.58** · etapa P5

> 0.21.58 zavádí řízené auto-patch promotion: GARP 2.5.1 zařazená aplikace může po ověření živého deploymentu přejít na vyšší patch bez ručního přepisu release-wave baseline.

## Pravidelná synchronizace

Workflow Studia se jako pojistka spouští jednou denně ve 3:17 UTC. Nejprve zkouší přímo nasazené `studio-manifest.json` z GitHub Pages. Pokud konkrétní Pages manifest není dosažitelný, ověří veřejný zdrojový repozitář (package + manifestovou šablonu), ale do runtime ponechá poslední známá metadata nasazení. Pouhý snapshot bez ověřeného zdroje je ve Správě označen zvlášť. Offline QA synchronizační report nepřepisuje.

GitHub může plánované workflow v dlouhodobě neaktivním veřejném repozitáři vypnout. Po prázdninové pauze proto zkontrolujte kartu Actions a případně použijte `Run workflow`.


## Řízené auto-patch promotion release wave

Od 0.21.58 se přesná verze v `release-wave.json` chápe jako schválený baseline pro danou major/minor wave, nikoli jako důvod ručně přepisovat každý legitimní patch. `src/config/release-promotion-policy.json` má výchozí `defaultMode: manual`; aplikace se do `auto-patch` režimu zařazuje jednorázově až po ověření jejího GARP 2.5.1 deployment pipeline.

Automatické promotion je povoleno pouze v `qa:ecosystem:verified`, tedy po skutečné síťové synchronizaci. Candidate musí být vyšší stabilní patch ve stejné major/minor řadě a `sync-report.json` jej musí potvrdit jako `verification: deployment`. Repository fallback ani snapshot nestačí. Současně zůstávají aktivní všechny stávající kontroly repository identity, Platform 1.1.2, required range, Studio Bridge, artifact envelope, storage namespace, cache identity, readiness a AI operations manifestu.

QA `release-wave.json` sama nepřepisuje. Tím je build deterministický a auditovatelný; aktuální rozhodnutí zapisuje do gitignorovaného `qa-results/release-promotion-report.json`. Minor/major změna, rollback nebo aplikace bez GARP enrollmentu stále vyžadují explicitní úpravu release wave/policy. V přechodném stavu je takto zařazen pouze `correspondence` od 5.10.25.

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
