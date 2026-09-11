# QA report — AI Studio GHRAB 0.7.3

## Ověřená oprava

- číslo verze má zakázané zalamování a zmenšování;
- na displejích do 650 px se hlavička karty přeskupí do samostatných řádků;
- ovládací prvky zůstávají uvnitř karty a jsou zarovnány doprava;
- stavový štítek se může bezpečně zalomit;
- desktopové rozložení nebylo změněno.

## Automatické kontroly

- validace zdrojových souborů a interních odkazů;
- kontrola přístupových pravidel a manuálů;
- kontrola mobilního CSS proti návratu chyby;
- sestavení distribučního adresáře;
- kontrola PWA cache a verze 0.7.3.

Výsledek: všechny automatické kontroly prošly.
