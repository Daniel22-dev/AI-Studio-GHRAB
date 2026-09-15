# AI Studio GHRAB 0.21.76 – Source Candidate Gate Hotfix

Datum: 2026-09-15

## Důvod vydání

GitHub CI 0.21.75 korektně ověřil všech devět zdrojů, ale release-wave gate zablokoval celé Studio, protože `generator-testu/main` už deklaroval 7.1.30, zatímco schválený MANUAL baseline Studia zůstával 7.1.28. Generátor 7.1.30 přitom nebyl produkčně připravený: jeho samostatná certifikační/deploy pipeline skončila `NOT_READY`.

## Oprava

- Repository fallback už nesmí přepsat runtime registry novějším source-only kandidátem.
- Pokud je repository verze vyšší než release-wave a deployment manifest není ověřen, registry zůstane na release-wave baseline a kandidát se zaznamená jako `PENDING`.
- `sync-report.json` transparentně nese `sourceVersion`, `releaseWaveVersion`, `registryPinned` a `pendingReleaseCandidate`.
- Verified ecosystem gate přijme tento stav pouze tehdy, když repository kandidát je skutečně novější než baseline a registry zůstává přesně připnutá k wave.
- Živě ověřený deployment s novější MANUAL verzí stále vytvoří wave drift a release zablokuje do explicitního ručního reconciliation.
- Repository verze starší než wave nebo neověřený snapshot release dál blokují.
- GARP 2.5.1 auto-patch policy se nemění.

## Zachované změny

0.21.76 obsahuje Performance Pack A–D i visual-lazy QA hotfix z 0.21.75. Produkční lazy loading ani runtime performance budgety se tímto hotfixem nemění.
