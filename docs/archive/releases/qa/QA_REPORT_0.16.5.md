# QA report — AI Studio GHRAB v0.16.5

Datum: 2026-07-15

## Automatické kontroly

- `npm run generate:changelog`
- `npm run format:check`
- `node scripts/test.mjs`
- produkční build do `dist/`

## Kontrolované nové funkce

- přítomnost elegantní celoplošné launch sekvence;
- časování plného, úsporného a vypnutého režimu;
- zachování tlačítka pro přeskočení animace;
- přítomnost PWA událostí `beforeinstallprompt` a `appinstalled`;
- nabídka instalace pouze na domovské stránce a mimo nainstalovaný standalone režim;
- automatické skrytí instalační nabídky po instalaci nebo dočasném odmítnutí.

## Kontrolované převzaté opravy 0.15.0

- přesná verze povinného školení;
- sada veřejných klíčů a aktivní `kid`;
- limit oprávnění 400 dní;
- automatické zapomenutí soukromého klíče;
- stabilní PWA identita;
- automaticky generovaný precache;
- bezpečnější strategie service workeru;
- denní GitHub synchronizace;
- automaticky generovaný changelog;
- odolnější integrační bootstrap.

## Výsledek

**Všechny kontroly AI Studio GHRAB prošly.**
