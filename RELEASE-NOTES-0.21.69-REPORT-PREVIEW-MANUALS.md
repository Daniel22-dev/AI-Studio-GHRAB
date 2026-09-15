# AI Studio GHRAB 0.21.69

Datum: 2026-09-14

## Změny

- Report má vstupní kartový rozcestník: Vývoj a zadání, Provozní podklady, Evidence práce, Souhrn pro vedení a Náhled a PDF.
- Pohled kolegy umí samostatný náhled Adély Stillerové (zástupce správce) a konkrétního kolegy z lokální evidence vydaných platných oprávnění.
- Náhled role nepoužívá skutečný admin permit ke spuštění aplikace; spouštění je v náhledu funkčně i vizuálně vypnuté.
- Interaktivní manuály byly srovnány s aktuálním rozhraním devíti aplikací, rolemi, Reportem a AI Akademií.
- Integrace počítá s AI Akademií 1.4.6, kde je návrat do Studia sjednocen do levého horního tlačítka.

## Bezpečnost

Změna nemění kryptografii permitů ani přenos oprávnění mezi aplikacemi. Náhled role je pouze lokální simulační vrstva nad existujícím přístupovým modelem; Academy return dál předává pouze bezpečnou návratovou URL.
