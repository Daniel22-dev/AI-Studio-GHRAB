# Architektura 0.1.0

## Princip

AI Studio GHRAB je statický portál. Čtyři aplikace zůstávají v samostatných repozitářích a portál je otevírá pomocí odkazů definovaných v `src/config/apps.json`.

```text
AI Studio GHRAB (GitHub Pages)
├── katalog aplikací
├── Centrum bezpečnosti
├── demo bez API
├── čtecí knihovna
├── pilotní lokální přehled
└── schéma ghrab-material-v1
        │
        ├── Generátor testů
        ├── Diferenciátor
        ├── LUDUS
        └── Korespondenční asistent
```

## Úložiště

Používá se pouze `localStorage` pro:

- `ghrab.language`,
- `ghrab.theme`,
- `ghrab.pilot.launches`.

Žádný obsah materiálů se v portálu neukládá.

## Připravenost na backend

Datové vrstvy mají záměrně samostatná rozhraní:

- registr aplikací v JSON,
- katalog knihovny v JSON,
- výměnný formát v JSON Schema,
- pilotní export v JSON.

Budoucí backend může tyto soubory nahradit API bez zásadní změny uživatelského rozhraní.
