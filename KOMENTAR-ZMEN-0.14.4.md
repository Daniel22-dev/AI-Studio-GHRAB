# AI Studio GHRAB 0.14.4 – oprava navigace

## Co bylo opraveno

Na stránkách **Správa → Evidence přístupů** a **Vydat nový přístup** se dříve zobrazovalo jen zkrácené menu. Po přechodu do těchto nástrojů proto zdánlivě zmizely záložky Tvorba materiálů, Materiály, Manuály, Bezpečnost a Prezentace.

Verze 0.14.4 sjednocuje jejich navigaci s celým AI Studiem. Oprávnění ani data uživatele se nemění; šlo pouze o chybu HTML navigace. Záložka **Správa** zůstává při práci v obou nástrojích zvýrazněná.

## Technické pojistky

- obě stránky jsou nově součástí kontroly jednotné navigace,
- Vydání přístupu načítá CSS a JavaScript s číslem verze, aby prohlížeč nepoužil starou kopii,
- sestavený obsah složky `dist` vzniká automaticky z opraveného `src`.
