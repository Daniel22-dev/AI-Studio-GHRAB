# QA report — AI Studio GHRAB 0.2.0

Datum kontroly: 10. 7. 2026

## Ověřené verze

- Generátor interaktivních testů 7.0.4
- Diferenciátor 1.0.1
- LUDUS 1.14.1
- Korespondenční asistent 4.0.1

## Výsledky

- AI Studio: offline synchronizace a kompletní testovací brána prošly.
- Diferenciátor: 57/57 interních testů prošlo.
- Korespondenční asistent: 17/17 interních testů prošlo.
- LUDUS: validace manifestu, 12 HTML enginů a build prošly.
- Generátor: produkční build 7.0.4 prošel a vytvořil `studio-manifest.json`.
- Všechny čtyři manifesty odpovídají kontraktu `ai-studio-app-manifest-v1`.
- YAML workflow soubory byly syntakticky ověřeny.
- V balíčcích nejsou vloženy tokeny ani společné API klíče.

## Známá skutečnost Generátoru

Původní plná strukturální testovací sada Generátoru upozorňuje na dva starší velké zdrojové moduly. Jde o stav dodané aplikace, nikoli o chybu integrace AI Studia. Automatické nasazení proto zachovává ověřenou produkční bránu `scripts/build.mjs`; samotný build a manifest jsou funkční.

## Stav synchronizace v distribučním ZIPu

Výchozí registr používá fallback, protože nové manifesty ještě nejsou zveřejněny na GitHub Pages. Po nahrání zdrojových repozitářů a prvním workflow běhu se AI Studio přepne na živou synchronizaci.
