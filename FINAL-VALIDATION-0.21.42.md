# AI Studio GHRAB 0.21.42 – finální validace Platform 1.1.2 wave locku

Datum: 2026-09-06

## Příčina pádu 0.21.41 na GitHub CI

GitHub synchronizace úspěšně ověřila všech 9/9 child zdrojů a 0 snapshotů. Následný fail-closed `qa:ecosystem:verified` správně zastavil release kvůli jedinému driftu:

`sortio: wave version drift (1.1.5 != 1.1.4)`

SORTIO 1.1.5 je finální child verze po opravě pouze negative-control testovacího harnessu; produkční suite-session cleanup se v této opravě neměnil.

## Oprava 0.21.42

- `src/config/release-wave.json`: SORTIO 1.1.4 -> 1.1.5.
- Aktuální registry, platform consumers, AI readiness a dokumentace jsou sjednoceny s finálními child verzemi.
- AI Studio verze zvýšena 0.21.41 -> 0.21.42 konzistentně v package/consumer/QA/PWA/runtime metadatech.
- Platforma zůstává přesně 1.1.2; `requiredPlatformRange` zůstává `>=1.1.2 <2.0.0`.
- Fail-closed source-verification gate nebyl oslaben ani obcházen.

## Lokální výsledky

- `npm test`: PASS.
- `qa:ecosystem`: PASS – 9 child aplikací + AI Studio, Platform 1.1.2 wave bez driftu.
- audit regressions: 50/50 PASS.
- security regressions: 16/16 PASS.
- GARP security regressions: 19/19 PASS (syntetická data).
- Platform conformance po buildu: 203/203 PASS.
- quality: 188/188 PASS.
- XSS sink audit: PASS.
- error reporter: 56 PASS / 0 FAIL; browser část NOT TESTED kvůli spravovanému Chromium URLBlocklistu.
- `build:school-server`: PASS.

## Přesný release-wave gate

V odhoditelné kopii byl přehrán stav, kdy je všech 9 zdrojů označeno jako source-verified. `npm run qa:ecosystem:verified` poté prošel:

`GHRAB ecosystem gate: PASS (9 aplikaci + AI Studio, Platform 1.1.2 wave bez driftu, zdroje 9/9 overeny).`

Nejde o náhradu GitHub online kontroly. Kandidát záměrně nese neověřený lokální `sync-report`; GitHub workflow před buildem provede čerstvé `npm run sync` a teprve poté musí projít skutečný `qa:ecosystem:verified`.

## Release politika

E-01 se tímto automaticky neuzavírá. Po zeleném nasazení AI Studia 0.21.42 zbývá společný post-deploy test celé Platform 1.1.2 release wave se syntetickými daty.
