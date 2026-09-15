# AI Studio GHRAB 0.21.71 — Performance Pack Phase B Validation

Datum validace: 2026-09-15

## Scope

Phase B byla omezena na rendering a škálování UI. Nebyl proveden redesign ani změna PWA/service-worker cache strategie. Navazuje na Performance Phase A 0.21.70.

## Implementované změny

- Provozní 30s polling již nepřekresluje celý portál, pokud se fakticky nezměnil provozní stav.
- Fingerprint ignoruje pouze časové/freshness změny, ale reaguje na změnu connectivity, stavu Studia nebo stavu jednotlivé aplikace.
- Polling má overlap guard, takže se dvě obnovení nemohou překrývat.
- Při skutečné změně stavu se použije existující ověřený render path; nevznikla paralelní DOM synchronizační implementace.
- Ikony aplikací mimo Top 4 dostávají `loading="lazy"` ještě před nastavením `src`.
- `.extra-app-card` používá `content-visibility: auto` a `contain-intrinsic-size`, aby browser nemusel plně renderovat vzdálené karty mimo viewport.
- Odstraněno redundantní volání access summary při změně jazyka.
- Přidána deterministická regresní sada pro 20/30/50 aplikací a Phase B chování.

## Regresní a bezpečnostní validace

- `npm test`: PASS
- Audit regressions: **57/57 PASS**
- Security regressions: **16/16 PASS**
- GARP security regressions: **19/19 PASS**
- Studio UX regression: PASS
- Live presence QA: PASS
- API usage contract: PASS
- Maturita Desk external launcher: PASS
- Task workflow: PASS
- Performance Phase A: PASS
- Performance Phase B: PASS
- `npm run verify:platform`: **207/207 PASS**
- `npm run qa:quality`: **194/194 PASS**, 0 warnings
- `npm run qa:lock`: PASS
- `npm run qa:xss`: PASS
- `npm run build:school-server`: PASS
- `git diff --check`: PASS

## Performance budget po Phase B

| Metrika | 0.21.70 Phase A | 0.21.71 Phase B | Limit | Stav |
|---|---:|---:|---:|---|
| nemediální `dist` | 2,398,689 B | **2,399,585 B** | 2,400,000 B | PASS |
| critical entry | 498,684 B | **499,290 B** | 500,000 B | PASS |
| precache | 1,762,713 B | **1,763,319 B** | 1,800,000 B | PASS |

Žádný limit nebyl zvýšen. Phase B je záměrně malý runtime zásah; větší vytvoření kapacitní rezervy patří do plánované Phase C.

## Škálovací validace

Nový regresní test vytváří syntetické registry s **20, 30 a 50 aplikacemi** a ověřuje:

- Top 4 zůstává přesně čtyřčlenné a deterministické,
- zbytek registry je zachován jako extra aplikace,
- nedochází k duplicitám nebo ztrátě aplikací,
- současný model Top 4 + extra apps tedy není závislý na dnešním počtu aplikací.

## Browser-runtime omezení tohoto prostředí

Browser-runtime kontrola nebyla označena jako PASS.

Systémový Chromium v aktuálním pracovním prostředí je spravován politikou:

```json
"URLBlocklist": ["*"]
```

`npm run qa:runtime` proto končí timeoutem při pokusu otevřít lokální QA stránku (`app/index.html`). Playwright modul současně není v pracovním prostředí instalovaný. QA skripty ani bezpečnostní politiku jsem neobcházel.

Samostatná `qa-p5-acceptance` proto korektně hlásí 10/13 a jako chybějící uvádí pouze browser/release reporty:

- `dist/qa-p5-runtime-report.json`
- `dist/qa-p3-browser-report.json`
- `dist/qa-p5-release-report.json`

To není vydáváno za úspěšnou browser validaci. Praktický acceptance test má proběhnout na reálném školním PC / standardním CI prostředí, které lokální runtime stránku neblokuje.

## Závěr

Phase B 0.21.71 je z hlediska dostupných deterministických, platformních, bezpečnostních a statických performance bran zelená. Zásah neotevřel Phase C, nezměnil PWA cache architekturu a nezvýšil žádný performance budget.
