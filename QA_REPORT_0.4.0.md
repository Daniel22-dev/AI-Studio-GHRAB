# QA report - AI Studio GHRAB v0.4.0

Datum: 10. 7. 2026

## Shrnutí
AI Studio GHRAB bylo zkontrolováno jako profesionální školní brána pro portfolio AI aplikací. Aplikace prošla buildem i rozšířenou sadou automatických kontrol. Byla opravena nalezená chyba v kódu a přidány nové vrstvy pro changelog, interní diagnostiku, vlastnické zápatí a přípravu na budoucí serverový režim oprávnění.

## Co bylo opraveno
- Opravena duplicita klíče `s` ve starfield animaci v `src/app.js`.
- Sjednoceno vlastnické zápatí napříč HTML stránkami.
- Doplněn uživatelsky dostupný changelog.
- Doplněna diagnostická stránka Kontrola Studia.
- Doplněna konfigurační příprava na školení a oprávnění učitelů.
- Doplněno vizuální schéma růstu aplikační brány.
- Rozšířen service worker cache o nové stránky a konfigurace.
- Rozšířeny automatické testy tak, aby chytaly chybějící zápatí, odkazy, konfigurace, build výstupy a duplicitu starfield klíče.

## Provedené testy
- `npm test`
- interní build přes `scripts/build.mjs`
- kontrola registru aplikací
- kontrola fallback registru
- kontrola manifestu a service workeru
- kontrola CSP a viewportu u HTML stránek
- kontrola vlastnického zápatí u HTML stránek
- kontrola odkazů na changelog a diagnostiku
- kontrola schématu oprávnění
- kontrola schématu changelogu
- kontrola build výstupů pro nové stránky
- statická kontrola responzivních CSS pravidel

Výsledek: všechny automatické kontroly prošly.

## Mobilní zobrazení
Aplikace obsahuje viewport meta tagy a responzivní CSS pravidla pro úzké obrazovky. V testovacím prostředí se nepodařilo pořídit skutečný mobilní screenshot, protože headless Chromium blokovalo načítání lokálních i localhost stránek zásadou prostředí. Proto zde uvádím poctivé omezení: automatické a strukturální mobilní kontroly prošly, ale finální vizuální kontrolu na reálném telefonu doporučuji provést po nahrání na GitHub Pages.

## Doporučení pro další verzi
- Napojit oprávnění na skutečný školní login a backend.
- Doplnit agregované pilotní statistiky ze serveru.
- Přidat admin obrazovku pro správce Studia.
- Přidat export pilotního reportu pro vedení školy.
- Rozšířit interní katalog aplikací o stav školení, rizikovost a doporučené scénáře použití.
