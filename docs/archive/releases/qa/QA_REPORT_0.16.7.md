# QA report — AI Studio GHRAB v0.16.7

Datum: 2026-07-15

## Kontrolovaný problém

GitHub Actions po úspěšné online synchronizaci odmítl `src/config/apps.generated.json` kvůli formátování Prettieru.

## Ověření opravy

- online a offline synchronizační skripty mají společný následný formátovací krok,
- `format:generated` zasahuje pouze generované registry,
- po offline synchronizaci prochází `format:check`,
- produkční build a kompletní testovací sada procházejí,
- package-lock odpovídá verzi balíčku.
