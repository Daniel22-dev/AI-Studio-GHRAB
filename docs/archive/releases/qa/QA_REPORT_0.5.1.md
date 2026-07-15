# QA report AI Studio GHRAB 0.5.1

## Automatické výsledky

| Balík | Výsledek |
|---|---|
| AI Studio GHRAB 0.5.1 | `npm run sync:offline && npm test` — PASS |
| Generátor 7.0.5 | `npm test` — PASS; 28 workflow auditů, 0 selhání |
| Diferenciátor 1.0.2 | interní sada 57/57 — PASS |
| Korespondenční asistent 4.0.2 | interní sada 17/17 — PASS |
| LUDUS 1.14.2 | validace 15 manifestových záznamů a 12 HTML enginů — PASS |

## Co Studio kontroluje

- validitu všech JSON konfigurací, schémat a překladů,
- SemVer, HTTPS adresy, ikony a úplnost registru,
- zákaz předčasného produkčního statusu ve Studiu,
- syntaxi všech JavaScriptových souborů,
- CSP, viewport, zápatí a duplicitní HTML identifikátory,
- přítomnost tajemství a API klíčů,
- skutečnou anonymizační transformaci nad syntetickými citlivými daty,
- zákaz nechráněných zápisů do `localStorage`,
- sestavení kompletního `dist/`,
- existenci všech položek uvedených v PWA precache.

## Opravy ověřené v kódu

- živé manifesty již nepřepisují pilotní statusy produkčním označením,
- zaplnění nebo zablokování úložiště nezpůsobí tiché falešné uložení,
- pracovní koncept se automaticky ukládá a obnovuje,
- anonymní export nepřebírá pracovní prostor, názvy, prompty ani poznámky,
- vykázaný čas a automatický odhad jsou datově odděleny,
- integrační bannery nevkládají titul materiálu přes `innerHTML`,
- zdrojový balík Školních aplikací neobsahuje zastaralé sestavené kopie.

## Omezení automatického QA

Automatické testy nenahrazují finální kontrolu na fyzickém telefonu. Před pilotem zbývá ručně ověřit Android Chrome a iPhone Safari, PWA spuštěnou z ikony, orientaci na výšku i na šířku a čtyři reálné předávky mezi aplikacemi.

## Verdikt

Verze 0.5.1 je po technické stránce připravena k prezentaci a k řízenému serverless pilotu s proškolenými učiteli a anonymními daty. Není to ještě oficiální školní systém se skutečnými účty, serverově vynucenými oprávněními a centrální analytikou.
