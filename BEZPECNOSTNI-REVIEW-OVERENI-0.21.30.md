# Review následného ověření bezpečnostních oprav

**Projekt:** AI Studio GHRAB 0.21.30  
**Podklad:** `OVERENI-OPRAV-AI-STUDIO-0.21.29.txt` ze dne 21. 8. 2026  
**Metoda:** ověření tvrzení proti kódu, behaviorální protipříklady, statická QA a oba produkční buildy

## Verdikt

Následné ověření je věcně kvalitní. Z11 a Z12 byly potvrzeny. Z13 správně upozorňuje, že mechanismový test s posunutými hodinami nehlídá stáří skutečně distribuovaného artefaktu; jeho požadavek byl proto realizován jako samostatná release kontrola nad reálným časem.

## Z11 — potvrzen a opraven

Verze 0.21.29 skutečně používala podepsaný `issuedAt` současně jako měřítko stáří konfigurace i délky offline provozu. To by po 24 hodinách od podpisu uzamklo offline režim i uživateli, který byl před okamžikem online.

Verze 0.21.30 používá dvě nezávislá měřítka:

1. `fetchedAt`: nejvýše 24 hodin od posledního úspěšného online načtení;
2. podepsaný `issuedAt`/`generatedAt`: nejvýše 30 dní stáří konfigurace.

Samotný `fetchedAt` není bezpečnostní kotva. Rollback staršího bundle je omezen podpisem, 30denním limitem a nově také povinnou shodou `bundle.version` se zapečeným `deployment.sharedAccessVersion`. Generátor podpisu odmítá znovu použít aktuální verzi a novou verzi automaticky propíše do aktivních deployment profilů.

## Z12 — potvrzen a opraven

Původní 0.21.29 měla pro fail-closed deployment především textové regresní kontroly. Nový behaviorální test načte skutečný `platform-runtime.js` se zapečeným school-server profilem a nedostupnou síťovou konfigurací. Ověřuje, že:

- `direct-gemini` není vybraný ani povolený mód;
- `enforceLocalKeyPolicy()` vrací `allowed: false`;
- nalezené lokální provider klíče jsou odstraněny.

## Z13 — potvrzen v principu a opraven release bránou

Mechanismový test má správně používat řízený čas, aby byl deterministický. Nemůže však současně hlídat čerstvost distribuovaného souboru. Přibyla proto oddělená kontrola `check-access-bundle-freshness.mjs`, která vůči skutečnému času ověřuje:

- kryptografický podpis;
- shodu podpisu, bundle a `sharedAccessVersion`;
- platný podepsaný čas;
- maximální stáří 30 dní.

Běžný build vypíše varování. `access:check:required` a CI release workflow při chybě skončí neúspěchem, takže zastaralý bundle nelze nasadit.

## Stav aktuálního bundle

Bundle `access-p1-2026-08-04` je k 21. 8. 2026 starý přibližně 17 dní a nový 30denní limit splňuje. Není tedy pravda, že by po opravě 0.21.30 byl offline režim v dodaném balíku nefunkční. Zařízení však musí alespoň jednou úspěšně načíst bundle online a potom může pracovat offline nejvýše 24 hodin.

Současný bundle ještě obsahuje starší podepsanou kopii politiky. Tvrdý runtime limit 90 dní pro nová oprávnění platí i tak, ale před nejbližším nasazením je vhodné spustit `npm run access:sign`, aby bundle obsahoval také aktuální zdrojovou politiku a nový čas. Soukromý klíč se nevkládá do repozitáře ani neposílá jiné osobě.

## Nadále mimo kód

Beze změny zůstávají provozní kroky v GitHubu: ověřit minimální rozsah a expiraci tokenu `GHRAB_CORE_SYNC_TOKEN`, zapnout 2FA, ochranu větve, secret scanning a push protection a zajistit externí dohled nad případným vypnutím plánovaného workflow.

## Ověření změn

Lokálně prošlo 49/49 auditních regresí, 16/16 behaviorálních bezpečnostních regresí, 188/188 kontrol platformní shody a 176/176 kontrol kvality. Technická, bezpečnostní a PWA QA nehlásí žádný nález, XSS baseline zůstává na nule a standardní i school-server build byly úspěšné.

Browserová a axe-core část release brány nebyla lokálně spuštěna, protože zdrojový archiv neobsahuje připnuté vývojové závislosti ani browser runtime. V GitHub Actions zůstává blokující součástí release workflow.
