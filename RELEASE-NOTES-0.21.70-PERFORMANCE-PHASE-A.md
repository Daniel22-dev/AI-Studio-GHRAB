# AI Studio GHRAB 0.21.70

Datum: 2026-09-15

## Performance Pack – fáze A

- AUTO režim už neznamená automaticky FULL na každém desktopu. Rozhodování zohledňuje reduced motion, save-data, kompaktní/coarse zařízení, počet logických jader a dostupnou paměť.
- Silný desktop je pouze kandidát na FULL. Po startu proběhne jednorázový frame sample; pokud je vykreslování nestabilní, AUTO se v rámci relace stabilně sníží na LITE bez přepínání tam a zpět.
- Dekorativní animace hlavní brány se při odscrollování mimo aktivní oblast a na skrytém tabu explicitně pozastaví. Starfield zastaví render loop a po návratu pokračuje.
- Ruční FULL/LITE/OFF zůstává zachován. `prefers-reduced-motion` má bezpečně přednost před dekorativní animací.
- Motion preference se zapisuje do kanonického klíče `ghrab.ai-studio.motion.v1`; legacy `ghrab.motion` se nadále umí přečíst.
- Přidána deterministická regresní sada `test:performance-phase-a`.

## Performance budget

Existující limity nebyly zvýšeny. Změny musí projít stávající P5 quality gate včetně `distBytes`, `entryCriticalBytes` a `precacheBytes`.

## Bezpečnost a kompatibilita

Fáze A nemění kryptografii oprávnění, access-control, GARP guard, AI Core, aplikační registry, handoff kontrakty ani GHRAB Platform 1.1.2. Zásah je omezen na rozhodování o vizuálním režimu a lifecycle dekorativních efektů.
