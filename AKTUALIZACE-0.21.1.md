# Aktualizace AI Studio GHRAB 0.21.1

## Cíl

Navázat na zjednodušení 0.21.0, ale zachovat a zviditelnit velký budoucí potenciál společného katalogu materiálů po přechodu na školní server. Současně upravit Bezpečnost tak, aby rychlá kontrola dat byla pomocníkem jen pro nejisté situace, nikoli zdánlivě povinným krokem.

## Materiály: dnešní a budoucí režim

- Záložka **Materiály** je znovu v horní navigaci pro učitele i správce.
- **Tvorba materiálů** se do navigace nevrací. Obsah má vznikat v konkrétních aplikacích; Studio funguje jako katalog, pracovní prostor a předávací bod.
- V GitHub/serverless profilu stránka pravdivě uvádí, že vlastní materiály zůstávají pouze v prohlížeči a mezi kolegy se nesdílejí.
- Stránka explicitně popisuje budoucí serverový tok: sdílení v předmětové komisi, verzování bez přepisování originálu, stav **Ověřeno ve výuce** a vyšší stav **Doporučeno komisí**.

## Technická příprava serveru

Přidán modul `src/library/material-service.js`. Aktivuje serverové operace pouze při současném splnění:

- `profile = school-server`,
- `features.schoolServerConnected = true`,
- `features.sharedMaterialLibrary = true`.

Připravené operace:

- načtení komisí,
- načtení sdíleného katalogu komise,
- publikace anonymizovaného GHRAB Material v1 do komise,
- vytvoření vlastní kopie sdíleného materiálu,
- serverově autorizované quality events `classroom-tested` a `commission-reviewed`.

Přidáno schema `ghrab-shared-material-record-v1` a dokument `src/library/SERVER-MATERIALS-CONTRACT.md` s minimálním API kontraktem.

Klient odmítne serverovou publikaci materiálu, pokud `provenance.containsPersonalData === true`. Finální server musí navíc kontrolovat školní session, členství v komisi, Origin/CSRF ochranu, auditní stopu, retenci a zálohování.

## Bezpečnost

- Semafor zelená / oranžová / červená zůstává viditelný.
- Klikací kontrola je nyní schovaná pod **Nejsem si jistý → rychle posoudit**.
- Stránka výslovně říká, že kontrolu není nutné používat před každým použitím AI.
- Uživatel pouze označuje typ údajů; nevkládá text ani dokument. Kontrola zůstává čistě lokální a nepoužívá AI.
- Výsledek se zobrazí až po výběru a lze jej resetovat.

## Regresní pojistky

Testy nově vyžadují:

- Materiály v hlavní navigaci, ale nikoli centrální Tvorbu materiálů,
- explicitní server-ready vysvětlení a neaktivní stav bez serveru,
- trojitou podmínku pro aktivaci serverového katalogu,
- blokaci publikace materiálu s osobními údaji,
- připravené operace publish / fork / quality event,
- progresivně rozbalovací Rychlou kontrolu dat.
