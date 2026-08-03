# QA report — AI Studio GHRAB 0.7.0

## Výsledek

Automatická validace `npm test` byla spuštěna po finální úpravě a skončila úspěšně:

- build AI Studia 0.7.0 vytvořen;
- všechny kontroly prošly;
- žádná chyba validace nebyla nalezena.

## Kontrolované oblasti

- pět aktuálních aplikačních manifestů a jejich HTTPS `manualUrl`;
- dědění přístupů přes `hasAppAccess(appId)`;
- viditelnost všech karet a neaktivní tlačítka uzamčených manuálů;
- správcovský přístup ke všem průvodcům;
- navigace na všech standardních stránkách;
- CSP bez inline skriptů a inline stylů;
- interní odkazy a JavaScript syntaxe;
- PWA precache včetně `manualy/index.html`, `manualy/manualy.js` a `manualy/manualy.css`;
- kompletní distribuční build v `dist/`;
- aktuální verze aplikací: Generátor 7.0.8, Diferenciátor 1.1.1, Hodnotitel 1.3.7, Korespondenční asistent 5.0.1 a LUDUS 1.14.6.
