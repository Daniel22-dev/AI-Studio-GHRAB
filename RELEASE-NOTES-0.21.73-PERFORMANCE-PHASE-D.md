# AI Studio GHRAB 0.21.73 — Performance Phase D

## Scope

Fáze D převádí dosud deklarované runtime performance budgety na skutečnou release bránu a odlehčuje kritickou vstupní cestu hlavního portálu bez redesignu a bez snížení kvality režimu FULL.

## Změny

- `startup-prepaint.js` zakládá časovou značku `ghrab-studio-start`.
- Hlavní portál po vykreslení použitelných karet nastaví `data-studio-render-ready="true"` a měří `ghrab-studio-render-ready-ms`.
- `qa-p5-runtime.mjs` spouští samostatný benchmark na referenčním profilu 1366×768, CPU slowdown ×4 a vynucuje `runtimeBudget` z consumeru.
- Release acceptance explicitně odmítne kandidát, pokud runtime performance benchmark není `passed` nebo obsahuje performance failure.
- Gateway obrázek 760×760 se již nenačítá parserem v prvním kritickém request setu; načte se asynchronně po prvním použitelném renderu s nízkou prioritou a pevnými intrinsic dimensions.
- `entryCriticalBytes` budget je zpřísněn z 500 000 B na 420 000 B.
- Přidán `test:performance-phase-d`.

## Statický výsledek

- entry critical: **359 637 B / 420 000 B**
- před Phase D: **499 018 B / 500 000 B**
- úspora proti 0.21.72: přibližně **139 kB / 27,9 %**
- P5 quality: **194/194 PASS, 0 warnings**

## Runtime gate

Runtime gate měří:

- DOM nodes,
- render-ready time,
- JS heap used,
- cumulative layout duration do render-ready,
- cumulative task duration do render-ready.

Lokální systémový Chromium v pracovním prostředí je spravován globální `URLBlocklist`, takže zde nelze validně dokončit browserový localhost běh. Implementace je proto určena k definitivnímu měřenému potvrzení v existujícím GitHub Actions P5 gate, který instaluje pinned Playwright Chromium 1.61.1.
