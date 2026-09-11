# AI Studio GHRAB 0.21.47 R2 - performance budget hotfix

Datum: 2026-09-10

## Duvod
GitHub Actions po synchronizaci aktualnich registru prosly funkcni, bezpecnostni, PWA i platformni kontrolou, ale finalni P5 R2 performance gate zastavila release na `budget.distBytes`: 2 250 319 B pri limitu 2 250 000 B. Prekroceni bylo 319 B.

## Oprava
Build nadale zachovava zdrojove vyvojarske dokumenty v repozitari, ale do produkcniho `dist/` uz nekopiruje dva dokumenty, ktere nejsou runtime assety:

- `src/integration/SAVE-TO-STUDIO.md`
- `src/ai-core/releases/1.0.0/README.md`

Funkcni runtime soubory, verejny AI Core kontrakt, integracni JavaScript ani PWA instalacni onboarding se nemeni.

## Overeni
- `npm test`: PASS
- `npm run build`: PASS
- P5 quality/performance: 188/188 PASS lokalne
- `distBytes`: 2 245 334 B pred live CI synchronizaci
- `entryCriticalBytes`: 499 592 / 500 000 B
- `npm run qa:pwa`: PASS
- GHRAB Platform conformance: PASS
- `npm run build:school-server`: PASS

Verze zustava 0.21.47, protoze puvodni kandidat 0.21.47 neprosel release gate a nebyl uspesne vydan.
