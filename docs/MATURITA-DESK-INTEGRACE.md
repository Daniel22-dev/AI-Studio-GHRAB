# Maturita Desk – integrační runbook pro AI Studio

## Stav

Maturita Desk 1.0.1 je připravena jako samostatná PWA a budoucí dlaždice AI Studia. Ostrý maturitní obsah musí zůstat na izolovaném HTTPS originu, proto se aplikace nesmí vložit do stejného originu jako běžné aplikace jen kvůli sdílenému `localStorage` přístupu.

## Přístupový model

AI Studio kontroluje, zda aktuální permit obsahuje aplikační ID `maturita-desk`. Tato kontrola určuje dostupnost launcheru/dlaždice.

Samotný maturitní obsah dále chrání Maturita Desk vlastními vrstvami: autorizovaný izolovaný origin, publisher podpis `.mdesk`, šifrování a heslo k packu. Studio permit není náhradou této ochrany.

Navržené školení: `MAT-01`, verze `2026-09`.

## Co lze připravit před volbou produkční URL

- položku `maturita-desk` v `src/config/access-policy.json`;
- bezpečnostní výjimku v `src/config/permissions.json` pro aplikace s vlastní rovnocennou ochranou na izolovaném originu;
- integrační kontrakt a manifestový vzor v repozitáři Maturita Desk.

## Co se doplní po zřízení izolovaného hostingu

1. produkční `https://...` origin;
2. podepsaný `origin-authorization.json` v Maturita Desk;
3. publikovaný `studio-manifest.json` na produkčním originu;
4. položka `maturita-desk` v `src/config/sources.json`;
5. fallback manifest a ikona dlaždice;
6. nový kryptograficky podepsaný `access-config-bundle.json` + podpis;
7. nové učitelské permits s `maturita-desk` jen pro oprávněné kolegy.

## Důležité pravidlo pro release

Současný podepsaný access bundle se nesmí ručně editovat bez soukromého podpisového klíče. Změna zdrojové `access-policy.json` je pouze připravená budoucí politika. Do živého provozu se dostane až novým řádně podepsaným bundlem.

## Požadované regresní scénáře

- admin vidí/spustí Maturita Desk;
- učitel s `maturita-desk` ji vidí/spustí;
- učitel bez `maturita-desk` je odmítnut;
- znalost přímé produkční URL sama nezpřístupní `CONFIDENTIAL-EXAM` obsah;
- veřejný GitHub Pages demo origin nadále odmítá `CONFIDENTIAL-EXAM`;
- chybný publisher podpis je odmítnut;
- chybné heslo je odmítnuto;
- správný podepsaný pack + heslo fungují;
- offline restart po předchozím importu funguje podle pravidel Maturita Desk.
