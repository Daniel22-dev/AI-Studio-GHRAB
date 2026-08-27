# AI Studio GHRAB 0.20.1 — oprava integrity Core v GitHub Actions

## Důvod vydání

Workflow verze 0.20.0 spouštěl Prettier také nad neměnnými soubory vydaného GHRAB AI Core 1.0.0. Formátování změnilo jejich bajtovou podobu a následná kontrola SHA-256 správně zastavila build.

## Oprava

- `src/ai-core/releases/**` je nyní v `.prettierignore`.
- `npm run format` i `npm run format:check` nejprve ověří SHA-256 vydaného Core.
- GitHub Actions ověří Core před formátováním a znovu bezprostředně po něm.
- Projektové testy kontrolují ochranný ignore, příkazy a pořadí workflow kroků.

## Co se nemění

- GHRAB AI Core zůstává ve verzi 1.0.0 a jeho soubory nebyly upraveny.
- Migration Kit zůstává ve verzi 1.0.2.
- Výchozí provoz zůstává `direct-gemini` bez automatického fallbacku.
- Funkce a vzhled AI Studia se nemění.
