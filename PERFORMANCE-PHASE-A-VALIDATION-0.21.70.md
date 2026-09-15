# AI Studio GHRAB 0.21.70 - Performance Phase A validation

Datum: 2026-09-15

## Rozsah

Faze A byla omezena na runtime vykon hlavniho portalu:

- adaptivni AUTO pro FULL/LITE/OFF,
- kompatibilni migrace motion preference na kanonicky Platform 1.1.2 storage klic,
- jednorazova runtime frame kalibrace pouze pro AUTO kandidata na FULL,
- bez oscilace a bez automatickeho upgradu z LITE na FULL,
- pozastaveni dekorativnich efektu mimo viewport a pri skrytem tabu,
- odlozeni/skip startup intro na zjevne slabem nebo setricim zarizeni,
- regresni testy Phase A.

Mimo rozsah zustaly PWA/cache redesign, repo hygiene, UI skalovani a dalsi performance faze.

## Bezpecnostni a platformni zasady

- GHRAB Platform contract zustal 1.1.2.
- GARP/access/security logika nebyla oslabena ani obchazena.
- Stavajici performance budgety nebyly zvyseny.
- `prefers-reduced-motion` ma prednost i pred rucne zvolenym FULL.
- Rucni volba uzivatele ma jinak prednost pred AUTO heuristikou.
- AUTO downgrade se uklada pouze do session profilu; nevytvari trvaly lock na slabsi rezim.

## Finalni automaticke overeni

PASS:

- `npm test`
- audit regressions: 57/57
- security regressions: 16/16
- GARP security regressions: 19/19
- Studio UX regression
- live presence QA
- API usage contract
- task workflow regression
- Performance Phase A regression
- `npm run verify:platform`: 207/207
- `npm run qa:quality`: 194/194, 0 warnings
- `npm run qa:lock`
- `npm run qa:xss`
- `npm run qa:pwa`
- `npm run build:school-server`

Finalni P5 quality budget:

- `distBytes`: 2 398 689 / 2 400 000 B
- `entryCriticalBytes`: 498 684 / 500 000 B
- `precacheBytes`: 1 762 713 / 1 800 000 B
- `largestFileBytes`: 140 614 / 200 000 B
- `duplicateLargeBytes`: 32 663 / 260 000 B
- lazy presentation media: 56 433 046 / 65 000 000 B

Poznamka: `distBytes` a `entryCriticalBytes` zustavaji tesne pod stavajicim limitem. Limity nebyly zvyseny. Vetsi rezervu ma vytvorit az nasledujici performance faze zamerená na velikost/build/cache, nikoli faze A.

## Browser QA - omezeni prostredi

Browser runtime gate nebyl v tomto pracovnim prostredi oznacen jako PASS. Systemovy Chromium je spravovan politikou s `URLBlocklist: ["*"]`, ktera blokuje i lokalni QA URL na 127.0.0.1. Runtime test proto konci timeoutem drive, nez muze nacist aplikaci.

QA skripty ani browser politika nebyly kvuli tomu oslabeny, patchovany ani obchazeny. Toto je omezeni testovaciho prostredi, nikoli nalezena funkcni chyba AI Studia.

## Doporuceny realny acceptance test na skolnim PC

Pred dalsi fazi je vhodne overit na zarizeni, na kterem se puvodne projevovalo sekani:

1. Vymazat/obnovit starou PWA cache nebo nacist novou verzi 0.21.70.
2. Nastavit animace na AUTO.
3. Overit, jaky rezim AUTO vybere a zda je portal plynulejsi.
4. Rucne zkusit FULL, LITE a OFF a overit, ze vsechny ovladaci a launch workflow zustavaji funkcni.
5. Odsrolovat mimo hlavni gateway a overit, ze dekorativni pohyb prestane bez vlivu na zbytek UI.
6. Prepnout tab do pozadi a zpet a overit korektni pause/resume.
7. Pokud OS/prohlizec pouziva reduced motion, overit, ze Studio nevynucuje FULL.

## Zaver

Faze A je po statickych, Node, security, GARP, platformnich, PWA a quality regresich pripravena jako kandidat 0.21.70. Jediny neuzavreny dukaz je browser runtime v tomto konkretnim pracovnim prostredi kvuli externi spravovane Chromium politike; doporucenym acceptance bodem je proto realny test na skolnim PC.
