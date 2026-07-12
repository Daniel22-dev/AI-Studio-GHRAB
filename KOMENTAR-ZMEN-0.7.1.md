# AI Studio GHRAB 0.7.1 — komentář změn

## Důvod opravy

Při vložení záložky **Manuály** byla na části stránek neúplně nahrazena HTML značka následující položky **Bezpečnost**. Prohlížeč proto zobrazil fragment značky přímo v navigaci.

## Provedená oprava

- obnovena úplná značka odkazu `safety/` na všech standardních stránkách;
- zachováno pořadí **Materiály → Manuály → Bezpečnost → Můj přístup**;
- přidána regresní kontrola `data-nav="safety"`;
- přidána kontrola fragmentů poškozených relativních odkazů v navigaci.

Oprava nemění oprávnění, adresy aplikací ani fungování manuálů.
