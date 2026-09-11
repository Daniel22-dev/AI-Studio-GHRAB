# AI Studio GHRAB 0.20.5

## Oprava hlášení chyby

Příčinou neotevření e-mailu bylo použití `window.open()`. Chrome může skriptované popup okno zablokovat i tehdy, když uživatel klikl na kombinovanou akci a ZIP se úspěšně stáhl.

Verze 0.20.5:

- používá pro Gmail skutečný odkaz `<a target="_blank">`;
- na původní kartě současně připraví a stáhne ZIP;
- zachovává záložní odkazy na Gmail, poštovní aplikaci a kopírování údajů;
- odstraňuje nespolehlivou volbu přímého sdílení ZIP;
- aktualizuje společný návod;
- přidává prohlížečový regresní test se skutečným kliknutím v Chromiu.

Nejdříve nasaďte Korespondenčního asistenta 5.9.9 a potom AI Studio GHRAB 0.20.5.
