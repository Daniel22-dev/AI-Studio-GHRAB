# Hotfix 0.21.68 - P5 XSS sink gate

Datum: 2026-09-14

GitHub P5 R2 release gate zastavil verzi 0.21.68 na jediném regresním nálezu: `src/report/tasks.js` používal při vykreslení nápovědy režimů práv A/B/C jeden zápis přes `innerHTML`, zatímco bezpečnostní baseline AI Studia vyžaduje nulový počet těchto HTML sinků.

Hotfix zachovává stejný obsah i UX nápovědy, ale skládá jej výhradně pomocí DOM API (`textContent`, `createTextNode`, `append`). Baseline se tím vrací na `innerHTML: 0`.

Ověření po opravě:
- `npm run qa:xss`: PASS, 0 HTML sinků nad baseline
- `npm run build`: PASS
- `npm test`: PASS
- `npm run qa:quality`: 194/194 PASS
- `npm run test:task-workflow`: PASS
- `npm run build:school-server`: PASS

GitHub log před opravou současně potvrzoval, že browser/runtime audit 0.21.68 prošel bez nálezu a release gate selhal až v následném `qa:xss` kroku.
