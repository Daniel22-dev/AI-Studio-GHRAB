# AI Studio GHRAB 0.21.63 – GARP auto-patch hotfix

Datum: 2026-09-13

## Důvod
Denní synchronizace správně načetla ACTIVA 0.5.27, ale release-wave stále držel starou baseline 0.5.22 a ACTIVA nebyla zařazena do GARP 2.5.1 auto-patch policy. Gate proto skončil `NOT_ENROLLED`; navazující diagnostika pak pouze sekundárně hlásila chybějící QA report. SORTIO bylo mezitím dokončeno na 1.1.17 a mělo stejný typ budoucího driftu proti baseline 1.1.14.

## Oprava
- ACTIVA 0.5.27 a SORTIO 1.1.17 jsou explicitně zařazeny do `release-promotion-policy.json` jako GARP 2.5.1 SHIELD-PREP baseline.
- `release-wave.json` je srovnán na 0.5.27 / 1.1.17.
- Snapshot registru a fallback jsou srovnány na stejné verze, aby lokální/offline kontrola nevracela starou baseline.
- Regresní test promotion policy kontroluje `current >= minimumVersion` místo chybného `current === minimumVersion`, takže budoucí bezpečně přijatý patch nezpůsobí při dalším běhu falešný fail.

## Co zůstává fail-closed
Auto-promotion vyžaduje skutečný `verification: deployment` a dovoluje pouze vyšší patch. Minor/major změna, rollback, prerelease, repository fallback, snapshot a drift Platform/Studio Bridge/storage/cache/AI invariantu zůstávají blokované. Lesson Hub, Diferenciátor a Generátor zůstávají v režimu `manual`.

## Dopad
Jde o CI/release-policy hotfix. Uživatelské workflow, data, přístupová oprávnění ani performance budget se nemění.
