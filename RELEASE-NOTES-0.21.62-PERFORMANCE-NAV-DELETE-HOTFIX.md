# AI Studio GHRAB 0.21.62 – performance / navigation / draft-delete hotfix

Datum: 2026-09-12

## Důvod
Po nasazení 0.21.61 byla hlášena pomalejší odezva horní navigace a pomalejší náběh Studia. Současně chyběla možnost odstranit omylem založené rozepsané zadání.

## Opravy
- startup intro používá stabilní persistentní stav a po prvním zobrazení se při běžných návratech neopakuje;
- PWA service worker omezuje souběžné stahování volitelných offline assetů na dávky po čtyřech a pro HTML navigaci používá cache aktuální verze před síťovým fallbackem;
- horní navigace okamžitě signalizuje probíhající přechod;
- rozcestník Reportu má okamžitou aktivní odezvu;
- drahé vykreslování dvou A4 canvasů je lazy podle viditelnosti, vstup titulku je debounce a API spotřeba se pro stejné období cachuje v běžící stránce;
- rozepsané zadání lze přes potvrzenou akci `Smazat rozepsané zadání` odstranit; po uzavření zůstává pouze auditní zrušení/nahrazení.

## Bezpečnost a data
Datové formáty, přístupová politika, GARP kontrakty ani serverové rozhraní se nemění. Hard delete je úmyslně povolen pouze pro stav `draft`; po uzavření karta zůstává dohledatelná.

## Performance budget
Žádný limit se nezvyšuje. Aktivní `distBytes` budget zůstává 2 400 000 B.
