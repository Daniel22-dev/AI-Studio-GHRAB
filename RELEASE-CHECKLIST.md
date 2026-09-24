# Release checklist AI Studio GHRAB 0.21.97

> Aktuální verze: **0.21.97** · etapa P5

> Toto je aktivní checklist po finálním GARP 2.5.1/N5/Safe Promotion cleanupu. Předchozí historický checklist je zachován v `docs/archive/RELEASE-CHECKLIST-pre-final-0.21.89.md`.

## GARP 2.5.1 / N5

- [x] AI Studio má vlastní GARP 2.5.1 tooling a není považováno za GARP pouze proto, že orchestruje dílčí aplikace.
- [x] `qa:p5:ci` spouští GARP self-test, source secret scan a deployment leak scan jako povinné release gate.
- [x] Kanonický GARP self-test prochází 98/98.
- [x] N5 negative controls fail-closed detekují private JWK s `d`, encrypted private PEM a private PGP.
- [x] N5 pokrývá také DER/binary a zakódované nebo komprimované varianty včetně base64, hex, gzip a ZIP.
- [x] Soukromý materiál nelze obejít reviewed výjimkou; výjimky jsou hashově vázané na přesný source blob.
- [x] Produkční `dist/` je před releasem znovu skenován.

## Release identity a evidence

- [x] AI Studio používá `ghrab-release-integrity-v2`.
- [x] Release identity váže `appId`, verzi, source commit a exact artifact digest.
- [x] Stejný release současně váže manifest, CycloneDX SBOM, build provenance a security evidence manifest.
- [x] P5 i LIVE deploy ověřují vytvořený release chain před publikací.
- [x] Režim je pravdivě označen `TRANSITIONAL`; produkční release signing key zatím není zaveden a evidence netvrdí neexistující podpis.
- [x] Auditní evidence se ukládá jako GitHub Actions artifact konkrétního SHA/runu.

## Safe Promotion a ochrana main

- [x] Trvalá release cesta je `candidate → candidate-to-main → p5-release-gate → PR candidate→main → p5-release-gate → main → deploy`.
- [x] Aktivní Ruleset pro `main` vyžaduje PR a `p5-release-gate`, blokuje deletion a non-fast-forward a nemá bypass actors.
- [x] `p5-release-gate` závisí na jobu `candidate-to-main`; PR z jiné větve se odmítne.
- [x] Safe Promotion pracuje s exact checked SHA a ignoruje stale GREEN.
- [x] Auto-patch ani deploy workflow nepíší přímo do `main`.
- [x] Produkční deploy běží pouze z `main` a ověřuje původ aktuálního main SHA z merged candidate PR.
- [x] FAIL kandidáta ponechá `main` beze změny; GREEN kandidát může být automaticky promován.

## AI Studio auto-patch

- [x] Promotion přijímá pouze vyšší stabilní PATCH ve stejné major/minor řadě.
- [x] Rollback, stejná verze jako nová promotion, minor, major, repository fallback a snapshot se automaticky nepřijímají.
- [x] Vyžaduje se live deployment, správné appId/repository, Platform 1.1.2/range, Studio Bridge, artifact envelope, storage namespace a cache identity.
- [x] Aktuálně je explicitně enrolled všech devět dílčích aplikací.
- [x] Osm aplikací vyžaduje `ghrab-release-integrity-v2`; LUDUS používá schválený přechodový `ghrab-patch-assurance-v1`.
- [x] Skutečný release-wave delta zvýší patch verzi AI Studia právě jednou.
- [x] Duplicate dispatch je GREEN/NO-OP bez dalšího commitu nebo version bumpu.
- [x] Concurrent duplicate dispatch je serializovaný; stale persistence guard brání druhé konfliktující promotion.
- [x] Idempotence test explicitně ověřuje PATCH=ELIGIBLE, minor/major=BLOCKED a duplicate=CURRENT.

## Kvalita releasu

- [x] Package, lockfile, consumer, PWA manifest, reporter, QA manifest, changelog a cache identity používají verzi 0.21.89.
- [x] Platform 1.1.2 a required range jsou zamčené a kontrolované.
- [x] Source verification, browser/runtime, XSS, axe, performance, PWA, technical, security a critical gate jsou součástí release cesty.
- [x] GitHub Actions použité v aktivních workflow jsou připnuté na plný commit SHA.
- [x] Podepsaný access bundle musí být před buildem čerstvý a validní.
- [x] Serverless profil neobsahuje provider API klíče ani soukromé podpisové klíče.
- [x] School-server build zůstává fail-closed a nepovoluje lokální provider keys.

## Známé přechodové limity — nejsou maskovány jako GREEN kryptografické uzavření

- Produkční release signing key pro AI Studio zatím není zaveden; assurance proto zůstává `TRANSITIONAL`.
- LUDUS ještě nepublikuje `ghrab-release-integrity-v2` exact-release identity a zůstává na přechodovém `ghrab-patch-assurance-v1` kontraktu.
- Současný GitHub Pages provoz není náhradou školní identity/serverové relace; serverové funkce se aktivují až v `school-server` profilu.

## Provozní pravidlo

Při jakékoli budoucí runtime změně musí znovu projít stejný candidate/P5/Safe Promotion/deploy řetězec. Dokumentační nebo archivní změna smí ponechat stejnou verzi pouze tehdy, pokud version-freshness gate potvrdí, že proti `main` neexistuje runtime delta.
