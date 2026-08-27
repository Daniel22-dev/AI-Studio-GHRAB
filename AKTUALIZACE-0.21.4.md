# Aktualizace AI Studio GHRAB 0.21.4

## Důvod hotfixu

GitHub Actions po opravě zobrazení všech osmi aplikací správně pokračovaly do bezpečnostní části P5 R2 brány. Offline browser test už prošel (`onlineCards: 8`, `offlineCards: 8`), ale následný XSS sink audit zastavil release, protože evidoval 14 přiřazení přes `innerHTML` proti schválenému baseline 12.

## Příčina

Server-ready rozšíření stránky **Materiály** přidalo nové prázdné, načítací a chybové stavy vytvořené pomocí `innerHTML`. Obsah těchto konkrétních řetězců sice pocházel z interních překladů, ale bezpečnostní pravidlo Studia záměrně nepovoluje nenápadné navyšování HTML sinků bez revize.

## Oprava

- všechny `innerHTML` zápisy ve `src/library/library.js` byly odstraněny;
- přibyl malý pomocník `setEmptyState()`, který vytváří element přes `document.createElement()` a text vkládá přes `textContent`;
- počet evidovaných `innerHTML` sinků klesl z 14 na 8;
- bezpečnostní baseline byl zpřísněn z 12 na 8, takže jejich budoucí návrat znovu zastaví CI;
- funkce server-ready sdílení Materiálů se tím nemění.

## Dopad

Jde o bezpečnostní a CI hotfix. Nemění role, oprávnění, manuály, Top 4, offline chování ani připravené budoucí sdílení v předmětových komisích.
