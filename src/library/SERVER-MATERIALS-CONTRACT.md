# Serverovy katalog materialu - kontrakt v1

Tento kontrakt je pripraveny v klientu AI Studia, ale v GitHub Pages profilu neni aktivni.
Aktivuje se pouze tehdy, kdyz deployment profil splni soucasne:

- `profile = school-server`,
- `features.schoolServerConnected = true`,
- `features.sharedMaterialLibrary = true`.

## Ucel

Katalog ma umoznit ucitelum sdilet anonymizovane vyukove materialy v ramci predmetovych komisi,
videt jejich verze a stav overeni a vytvaret vlastni kopie bez prepisovani puvodniho materialu.

## Minimalni endpointy

- `GET /api/v1/commissions` - komise dostupne prihlasenemu uzivateli.
- `GET /api/v1/materials?scope=commission&commissionId=<id>` - katalog vybrane komise.
- `POST /api/v1/materials` - publikace nove verze materialu do komise.
- `POST /api/v1/materials/<recordId>/fork` - vytvoreni vlastni kopie.
- `POST /api/v1/materials/<recordId>/quality-events` - udalost `classroom-tested` nebo `commission-reviewed`.

Server musi odvozovat identitu a opravneni ze skolni session, kontrolovat clenstvi v komisi,
Origin/CSRF ochranu, auditni stopu, retenci a zakaz sdileni materialu oznacenych jako obsahujici osobni udaje.

## Stav kvality

`draft -> shared -> teacher-reviewed -> classroom-tested -> commission-reviewed`

`classroom-tested` znamena skutecne pouziti ve vyuce potvrzene ucitelem. `commission-reviewed` je
vyssi stav dostupny pouze uzivateli s opravnenim predmetove komise. Klient nikdy nesmi tento stav
udelovat sam bez serverove autorizace.
