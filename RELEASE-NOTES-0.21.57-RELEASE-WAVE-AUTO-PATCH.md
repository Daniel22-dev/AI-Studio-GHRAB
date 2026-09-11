# AI Studio GHRAB 0.21.57 — řízené auto-patch promotion release wave

Datum: 2026-09-11

## Problém

AI Studio už při synchronizaci znalo novou verzi child aplikace, ale `release-wave.json` držel poslední ručně schválené číslo. Běžný patch proto mohl po úspěšném nasazení child aplikace shodit `qa:ecosystem:verified` pouze chybou `wave version drift`.

## Nové chování

- `release-wave.json` zůstává schváleným baseline lockem a během QA se automaticky nepřepisuje.
- Nová `src/config/release-promotion-policy.json` zavádí přechodový, výchozím stavem manuální promotion model.
- U aplikace jednou zařazené do GARP 2.5.1 auto-patch politiky smí verified ecosystem gate přijmout pouze vyšší stabilní patch ve stejné major/minor řadě.
- Auto-patch vyžaduje skutečně ověřený živý deployment. Repository fallback ani snapshot se pro automatické promotion neuznává.
- Rollback, prerelease, minor/major změna, změna repository identity, GHRAB Platform contract/range, storage namespace, cache identity nebo neověřený AI operations manifest release blokují.
- Každý verified běh zapisuje auditní `qa-results/release-promotion-report.json` s rozhodnutím `CURRENT`, `ELIGIBLE` nebo `BLOCKED` a reason code.

## Přechod během zavádění GARP 2.5.1

Automatický režim je nyní zapnut pouze pro `correspondence` od verze `5.10.25`, protože dodaný Korespondenční asistent poskytl referenční GARP 2.5.1 SHIELD-PREP pipeline a jeho deploy před publikací spouští `qa:p5:ci`.

Ostatní aplikace zůstávají díky `defaultMode: manual` beze změny. Po dokončení jejich GARP 2.5.1 migrace je lze jednorázově zařadit do stejné politiky; není nutné měnit promotion kód.

## Bezpečnostní důvod

Release gate se neoslabuje na pravidlo „vyšší číslo = přijmout“. Automatizuje se pouze běžný patch uvnitř již schválené minor wave a jen na základě živě nasazené verze z předem zařazeného GARP pipeline. Významnější změny stále vyžadují explicitní posun release wave.
