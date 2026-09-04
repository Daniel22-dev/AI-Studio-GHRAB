# AI Studio GHRAB 0.21.39 – GARP 2.3 D-01 delete/history hardening

## Kontext

Verze 0.21.39 vzniká v novém výslovně zahájeném nezávislém auditním cyklu po kontrole Claude nad 0.21.38. Claude potvrdil opravy C-01, C-02 a C-03, ale našel D-01 / HIGH: cesta `deleteMyData()` po úplném smazání neobnovovala generační tombstone, takže Browser Back mohl obnovit starý formulářový stav a další vstup jej znovu autosavem uložit.

## Oprava D-01

- `deleteMyData()` po destruktivním lokálním clear vždy vytvoří čerstvou neobsahovou hodnotu `ghrab.access.session-generation.v1`.
- Stejný helper pro rotaci používá i shared-device `endWork({clearApplicationData:true})`.
- Neúspěšný zápis generační značky je fail-closed chyba destruktivní operace; operace nesmí hlásit úplný úspěch bez obnovené lifecycle ochrany.
- Generační značka je bezpečnostní tombstone bez studentského obsahu. Předchozí owned data se nejprve plně smažou a ověří; teprve potom se vytvoří čerstvá značka.

## SIM-03

`scripts/test-shared-device-back-browser.mjs` nyní:

1. používá skutečný sestavený `platform-runtime.js`;
2. testuje `endWork` i `deleteMyData` jako dvě samostatné destruktivní cesty;
3. po Browser Back kontroluje prázdný formulář a nepřítomnost syntetického canary;
4. provede další uživatelský vstup a ověří, že autosave starý canary znovu nezmaterializuje;
5. otevře novou kartu a znovu ověří izolaci;
6. ukládá QA report do `qa-results/`, nikoli do veřejného `dist/`.

## Release status

Jde o kandidáta nového výslovně zahájeného cyklu. Reálná studentská data zůstávají zakázána, dokud nebude tento distribuovaný build nezávisle znovu ověřen podle GARP 2.3 a nebudou uzavřeny příslušné gate.
