# Automatizace aktualizací AI Studio GHRAB 0.21.92

> Aktuální verze: **0.21.92** · etapa P5

> 0.21.82 brání tomu, aby pouhý novější commit v repository `main` zablokoval Studio nebo se vydával za schválenou verzi. Repository kandidát bez deployment evidence zůstává pouze PENDING a runtime registry zůstává připnutá k release-wave baseline.

## Pravidelná synchronizace

Workflow Studia se jako pojistka spouští jednou denně ve 3:17 UTC. Nejprve zkouší přímo nasazené `studio-manifest.json` z GitHub Pages. Pokud konkrétní Pages manifest není dosažitelný, ověří veřejný zdrojový repozitář (package + manifestovou šablonu), ale do runtime ponechá poslední známá metadata nasazení. Pouhý snapshot bez ověřeného zdroje je ve Správě označen zvlášť. Offline QA synchronizační report nepřepisuje.

Od 0.21.76 platí explicitní pravidlo: **novější verze nalezená pouze v repository není release evidence**. Pokud repository hlásí verzi vyšší než schválený `release-wave`, synchronizace zachová baseline v `apps.generated.json` a novější verzi zapíše pouze jako `PENDING` source candidate. Teprve živý deployment nebo vědomé ruční reconciliation může změnit přijímanou verzi. Repository starší než wave se naopak nepovažuje za platné ověření baseline a verified gate jej odmítne.

GitHub může plánované workflow v dlouhodobě neaktivním veřejném repozitáři vypnout. Po prázdninové pauze proto zkontrolujte kartu Actions a případně použijte `Run workflow`.


## Řízené auto-patch promotion release wave

Od 0.21.59 se přesná verze v `release-wave.json` chápe jako schválený baseline pro danou major/minor wave, nikoli jako důvod ručně přepisovat každý legitimní patch. `src/config/release-promotion-policy.json` má výchozí `defaultMode: manual`; aplikace se do `auto-patch` režimu zařazuje jednorázově až po ověření jejího GARP 2.5.1 deployment pipeline.

Automatické promotion je povoleno pouze v `qa:ecosystem:verified`, tedy po skutečné síťové synchronizaci. Candidate musí být vyšší stabilní patch ve stejné major/minor řadě a `sync-report.json` jej musí potvrdit jako `verification: deployment`. Repository fallback ani snapshot nestačí. Současně zůstávají aktivní všechny stávající kontroly repository identity, Platform 1.1.2, required range, Studio Bridge, artifact envelope, storage namespace, cache identity, readiness a AI operations manifestu.

QA `release-wave.json` sama nepřepisuje. Tím je build deterministický a auditovatelný; aktuální rozhodnutí zapisuje do gitignorovaného `qa-results/release-promotion-report.json`. Minor/major změna, rollback nebo aplikace bez GARP enrollmentu stále vyžadují explicitní úpravu release wave/policy. Aktuálně je po samostatném GARP 2.5.1 ověření explicitně enrolled všech devět dílčích aplikací: Generátor, Diferenciátor, Hodnotitel, Korespondenční asistent, LUDUS, ACTIVA, SORTIO, Lesson Hub a Maturita Desk. Osm z nich vyžaduje `ghrab-release-integrity-v2`; LUDUS zůstává na schváleném přechodovém `ghrab-patch-assurance-v1`. `defaultMode: manual` nadále platí pro každou novou nebo dosud nezařazenou aplikaci.

## Safe Promotion AI Studia

Příjem ověřeného PATCH update probíhá pouze na trvalé větvi `candidate`. Pokud se po živém deployment ověření skutečně změní `release-wave.json`, workflow zvýší patch verzi AI Studia právě jednou a uloží společně wave delta a release metadata. Duplicitní nebo bezezměnový běh je NO-OP a verzi nezvyšuje. Souběžné ingesty jsou serializované a před zápisem se znovu kontroluje exact candidate SHA.

Z `candidate` následuje povinný P5/GARP/N5 běh, canonical PR `candidate → main`, další PR P5 a teprve potom merge přes aktivní Ruleset. Produkční deploy běží pouze z `main` a před sestavením ověřuje, že aktuální main commit skutečně pochází z merged candidate PR. Workflow auto-patche ani deploy workflow nesmí zapisovat přímo do `main`.

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
