# AI Studio GHRAB 0.21.48

## Úklid karet aplikací

- odstraněny pilotní stavové nápisy z karet,
- odstraněno vykreslování technických tagů a duplicitních přístupových chipů,
- kompaktní ovládání je sjednocené vpravo nahoře,
- pořadí: přesun Top 4 → stav testování správce → oblíbenost → provozní stav po aktivaci serveru → verze → zámek,
- zámek je vždy úplně vpravo,
- uzamčená aplikace zobrazuje větu „Daná aplikace se otevře až po absolvování příslušného školení.“,
- karty jsou zmenšeny a popisy byly přepsány do běžného učitelského jazyka.

## Centrální provozní stav

Přidán klient a serverový kontrakt pro tři stavy:

- zelená: `operational`,
- oranžová: `maintenance`,
- červená: `outage`.

Funkce je záměrně vypnutá, dokud není skutečně aktivní školní server (`schoolServerConnected` + `centralOperationalStatus`). Nic se neukládá do localStorage. Serverová implementace musí stav vynucovat i na cílových URL aplikací, aby nebylo možné omezení obejít přímým odkazem.

Podrobný kontrakt: `docs/OPERATIONAL-STATUS-SERVER-CONTRACT.md`.
