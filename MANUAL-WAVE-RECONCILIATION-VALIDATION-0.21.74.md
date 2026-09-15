# AI Studio GHRAB 0.21.74 — validace manual release-wave reconciliation

Datum: 2026-09-15

## Účel

Tento release odstraňuje blokaci CI způsobenou vědomě zastaralým manual release-wave lockem Generátoru. Nezapíná auto-patch pro žádnou další aplikaci a nemění Performance Pack A–D.

## Přijatý manual baseline

| Aplikace | Release-wave | Registry | Auto-patch |
|---|---:|---:|---|
| Generator | 7.1.28 | 7.1.28 | NE |
| Differentiator | 1.3.46 | 1.3.46 | NE |
| Lesson Hub | 1.2.22 | 1.2.22 | NE |
| Maturita Desk | 1.0.3 | 1.0.3 | NE |

AI Akademie není součástí současné devítiaplikační release-wave a nebyla tímto releasem přidána.

`release-promotion-policy.json` zůstal beze změny. SHA-256 před i po úpravě:

`80c889baa9d89735a466396e2e0325f93393117a70ed7aef7fb64d01eb503a41`

## Důkaz původní blokace

GitHub workflow 0.21.73 před pádem úspěšně synchronizoval 9/9 zdrojů (1 deployment, 8 repository fallback, 0 snapshot). Verified ecosystem gate následně hlásil jedinou chybu:

`generator: wave version drift (7.1.28 != 7.1.25); auto-promotion BLOCKED [NOT_ENROLLED]`

Tím bylo potvrzeno, že za Generátorem nebyl v tomto běhu další manual version drift.

## Source reconciliation

Aktuální upstream `Daniel22-dev/generator-testu` deklaruje `7.1.28`. Studio manifest template zachovává Platform 1.1.2, required range `>=1.1.2 <2.0.0`, storage prefix `ghrab.generator.` a version-bound cache identity.

Lokální `sync-report.json` není vydáván za live ověření. Generator je v něm ponechán jako `verification: snapshot`, `ok: false`, `sourceVersion: null`. Skutečný GitHub `npm run sync` musí při nasazení znovu vytvořit deployment/repository verification.

## Regresní ochrana

`test-release-promotion.mjs` nově explicitně hlídá:

- Generator, Differentiator, Lesson Hub a Maturita Desk nejsou auto-patch enrolled;
- jejich manual release-wave baseline odpovídá explicitně přijaté registry verzi;
- stávající GARP 2.5.1 auto-patch enrollment ostatních aplikací se nemění.

## Testy

- `npm test`: PASS / exit 0
- clean build bez předchozího `dist`, `dist-school-server` a `qa-results`: PASS / exit 0
- Platform conformance: 207/207 PASS
- P5 Quality: 194/194 PASS, 0 warnings
- audit regressions: 57/57 PASS
- security regressions: 16/16 PASS
- GARP security regressions: 19/19 PASS
- Performance Phase A: PASS
- Performance Phase B: PASS
- Performance Phase C: PASS
- Performance Phase D: PASS
- school-server build: PASS
- school-server audit: 57/57 PASS
- school-server GARP: 19/19 PASS

Izolovaná logická simulace `qa:ecosystem:verified` s 9/9 synteticky source-verified položkami skončila PASS a 0 auto-patch promotions. Po testu byl syntetický report odstraněn a poctivý snapshot `sync-report.json` obnoven.

## Performance budget 0.21.74

- non-media dist: 2,305,031 B / 2,400,000 B
- critical entry: 359,637 B / 420,000 B
- precache: 1,115,747 B / 1,250,000 B
- precache assets: 65
- P5 quality: 194/194, 0 warnings

## Verdict

0.21.74 je připraven jako GitHub kandidát pro explicitní manual release-wave reconciliation. Fail-closed promotion mechanismus není oslaben. Po nahrání musí GitHub `npm run sync` znovu ověřit skutečné upstream zdroje; teprve zelený verified ecosystem gate a navazující P5 runtime gate opravňují deployment.
