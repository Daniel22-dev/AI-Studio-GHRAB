# AI Studio GHRAB 0.21.76 – Source Candidate Gate Hotfix Validation

Datum: 2026-09-15

## Vstupní incident

GitHub CI kandidáta 0.21.75 synchronizoval 9/9 zdrojů, ale verified ecosystem gate skončil na:

`generator: wave version drift (7.1.30 != 7.1.28); auto-promotion BLOCKED [NOT_ENROLLED]`

Generátor 7.1.30 je aktuální source kandidát v `main`, nikoli bezpečně přijatý deployment baseline. Jeho samostatný workflow **Certifikace a nasazení** skončil `NOT_READY` (mimo jiné `testMode` undefined v Stage 1 simple profilu, Visual FAIL 8 a Critical FAIL 3). Proto 7.1.30 nebyla přijata do release-wave Studia.

## Bezpečnostní rozhodnutí

Schválený MANUAL baseline Generátoru zůstává **7.1.28**. Generátor není přidán do `release-promotion-policy.json`.

Nová pravidla repository fallbacku:

1. **Repository = wave** → běžné repository ověření.
2. **Repository > wave, deployment není ověřen** → runtime registry zůstane na wave; source kandidát se eviduje jako `PENDING`.
3. **Deployment > wave u MANUAL aplikace** → wave drift zůstává release blockerem do explicitního ručního reconciliation.
4. **Repository < wave** → repository fallback nesmí ověřit baseline a verified gate zůstává fail-closed.
5. **Snapshot bez ověřeného zdroje** → verified gate zůstává fail-closed.
6. **Auto-patch** → beze změny; promotion dál vyžaduje živý deployment a GARP 2.5.1 enrollment.

## Implementace

- `scripts/release-promotion.mjs`
  - `evaluateRepositoryFallback()` rozlišuje current / newer pending / invalid-or-older.
  - `isPendingRepositoryCandidate()` je jediný validátor PENDING repository stavu.
  - promotion report označí source-only kandidáta jako `PENDING`, ne `CURRENT` promotion.
- `scripts/sync-registry.mjs`
  - při novějším repository-only kandidátu zachová release-wave snapshot v `apps.generated.json`;
  - `sync-report.json` eviduje `sourceVersion`, `releaseWaveVersion`, `registryPinned`, `pendingReleaseCandidate` a důvod.
- `scripts/qa-ecosystem.mjs`
  - verified gate dovolí pouze přesně validovaný PENDING repository stav, kde je registry připnutá k wave a source verze je skutečně vyšší;
  - všechny ostatní source/version mismatch zůstávají blockerem.
- Správa Studia zobrazuje novější source verzi jako **kandidát čeká na release**.

## Deterministická simulace incidentu

Mockovaný stav přesně odpovídající incidentu:

- Generator deployment manifest: nedostupný,
- Generator repository `main`: 7.1.30,
- release-wave / registry baseline: 7.1.28,
- ostatních 8 aplikací: ověřené deploymenty.

Výsledek:

- registry Generator: **7.1.28**,
- repository source: **7.1.30**,
- `registryPinned`: **true**,
- `pendingReleaseCandidate`: **true**,
- promotion decision: **PENDING / SOURCE_CANDIDATE_PENDING_RELEASE**,
- verified sources: **9/9**,
- snapshots: **0**,
- auto-patch promotions: **0**,
- ecosystem gate: **PASS**.

## Neměnné policy soubory

`src/config/release-wave.json` SHA-256:

`66fd212f8b6324a6001e6635c85737327fbd6181babd7faa6b3e57bfa8c3500c`

`src/config/release-promotion-policy.json` SHA-256:

`80c889baa9d89735a466396e2e0325f93393117a70ed7aef7fb64d01eb503a41`

Hash obou souborů je stejný jako v 0.21.75.

## Finální regresní řetězec

- `npm test`: **PASS / EXIT 0**
- čistý checkout `npm test`: **PASS / EXIT 0**
- GHRAB Platform 1.1.2: **207/207 PASS**
- P3 Quality: **PASS**
- Audit regressions: **57/57 PASS**
- Security regressions: **16/16 PASS**
- GARP security regressions: **19/19 PASS**
- Studio UX: **PASS**
- Performance Phase A: **PASS**
- Performance Phase B: **PASS**
- Performance Phase C: **PASS**
- Performance Phase D: **PASS**
- P5 lock: **PASS**
- XSS sink gate: **PASS**
- PWA gate: **PASS**
- school-server build: **PASS** (187 souborů, 58 752 156 B)
- school-server audit: **57/57 PASS**
- school-server GARP: **19/19 PASS**

## Performance budgety

| Metrika | 0.21.76 | Limit |
|---|---:|---:|
| non-media dist | 2 306 608 B | 2 400 000 B |
| critical entry | 359 637 B | 420 000 B |
| precache | 1 115 747 B | 1 250 000 B |
| precache assets | 65 | — |

Performance Pack A–D ani visual-lazy QA hotfix z 0.21.75 nebyly vráceny.

## Lokální browser omezení

Lokální runtime browser acceptance se v tomto prostředí nepoužívá jako release důkaz; rozhodující browser/runtime gate proběhne v GitHub Actions s připnutým Playwright Chromium. 0.21.76 řeší blocker, který nastává ještě před browser QA.

## Verdikt

**0.21.76 je připraven jako GitHub kandidát.** Očekávané chování při současném stavu Generátoru je: repository 7.1.30 bude evidováno jako PENDING, Studio zůstane na schváleném baseline 7.1.28 a pipeline bude pokračovat k visual/runtime QA místo falešného failu na source-only driftu.
