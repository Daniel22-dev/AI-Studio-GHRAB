# AI Studio GHRAB 0.21.58 — rozšíření GARP auto-patch enrollmentu

Datum: 2026-09-11

## Co se mění

Řízené release-wave auto-patch promotion z verze 0.21.57 zachovává stejnou architekturu a fail-closed princip. Rozšiřuje se seznam aplikací s nezávisle ověřenou GARP 2.5.1 SHIELD-PREP baseline a současně se zpřesňuje kontrola Studio Bridge profilu, aby bylo možné bezpečně podporovat i aplikaci, pro kterou je Bridge legitimně `not-applicable`, bez povolení pozdějšího driftu mezi profily.

Nově jsou zařazeny:

- `essay-evaluator` od `1.5.25` — nezávislý Claude Role B review kola 3 uzavřel všechny relevantní nálezy předchozího kola; PREP gate a GARP kontroly prošly a OVERALL AMBER je dán pouze neprovedeným LIVE rozsahem.
- `ludus` od `1.16.23` — nezávislý Claude Role B review kola 3 uzavřel LU-N15 až LU-N19, potvrdil plný `qa:p5:ci` a reprodukovatelnou PREP bránu; nové nálezy jsou pouze LOW/INFO.
- `correspondence` zůstává zařazen od `5.10.25` beze změny.

## Co se zatím nezařazuje

- `lesson-hub` `1.2.22` — dostupná evidence obsahuje předání pro nezávislé kolo 5, ale nikoli finální výstup `OVERENI-KANDIDATA-lesson-hub-1.2.22.txt`; poslední dohledaný nezávisle přijatý PREP stav je 1.2.21.
- `differentiator` `1.3.46` — kandidát je explicitně předán k dalšímu nezávislému Prompt E kolu; finální nezávislé uzavření přesné 1.3.46 baseline není v dostupné evidenci.
- `generator` `7.1.25` — tato verze měnila distribuovaný runtime po 7.1.24 a vlastní release metadata výslovně vyžadují novou nezávislou revalidaci před přenesením GARP evidence.

Tyto aplikace zůstávají pod `defaultMode: manual`. Tím se nic nerozbíjí: jejich současné přesné verze mohou zůstat v release-wave, ale budoucí version drift se bez enrollmentu automaticky nepřijme.

## Bezpečnostní invarianta

Auto-promotion nadále znamená pouze vyšší stabilní patch ve stejné major/minor řadě a vyžaduje živě ověřený deployment, shodnou repository identity, Platform 1.1.2 contract/range, storage namespace, cache identity, artifact envelope a konzistentní AI operations manifest. Studio Bridge profil je nově zamčen per enrollment baseline: KS a LUDUS musí zůstat na v2, Hodnotitel musí zůstat `not-applicable`; změna mezi těmito profily je blokující. Rollback, prerelease, minor/major změna, snapshot nebo repository fallback zůstávají blokující.
