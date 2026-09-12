# AI Studio GHRAB 0.21.61 — Report workflow UX

Datum: 2026-09-12

## Důvod změny

Po zavedení karet zadání v 0.21.59 byly na stránce Report vedle sebe dva odlišné procesy: samostatné zadání vývoje a příprava měsíčního reportu. Horní rozcestník je zobrazoval jako směs pěti tlačítek, dvě zvýrazněná primární barvou a čtyři číslovaná. Karta zadání navíc obsahovala tlačítko „Vykázat běžnou práci“, které působilo, jako by běžná agenda byla součástí procesu schvalování zadání.

## Změny

- Rozcestník nyní jasně odděluje **Zadání vývoje** jako samostatnou agendu od čtyř kroků **Měsíčního reportu**.
- Čtyři kroky reportu mají jednotný vizuální styl a pořadí 1–4.
- Z karty zadání bylo odstraněno tlačítko **Vykázat běžnou práci**; běžná agenda patří do Evidence práce.
- Vybraná karta zobrazuje stav Návrh → K odsouhlasení → Schváleno → Předáno → Nasazeno.
- Každé pole zadání má vysvětlení a příklad, co do něj patří.
- Uzavření návrhu je výslovně popsáno jako zmrazení konkrétní verze k odsouhlasení, nikoli jako schválení, dokončení nebo nasazení.
- Ve stavu K odsouhlasení je zobrazen jednoznačný další krok: stáhnout PDF a přiložit je k e-mailu ředitelce nebo jiné oprávněné osobě za školu.
- Evidence práce a manažerský souhrn dostaly kontextovou nápovědu a příklady.

## Záměrně beze změny

- Schéma lokálního registru karet `ghrab-task-register-v1`.
- Pravidla validace souhlasů, předání a nasazení.
- Dvoustránkový formát měsíčního PDF.
- Privacy hranice: soukromé poznámky se nepřenášejí do reportu ani anonymních exportů.
- Všechny P5 performance limity kromě celkového nemediálního `distBytes`; ten je kvůli rozšířené nápovědě UI úzce posunut z 2 380 000 na 2 400 000 B.

## Performance budget

Rozšířená kontextová nápověda a stavový workflow Reportu zvyšují pouze celkový nemediální distribuční objem. Aktivní limit `distBytes` se proto mění z 2 380 000 na 2 400 000 B. Limity `entryCriticalBytes`, `precacheBytes`, `largestFileBytes`, duplicate-large-assets i runtime budget zůstávají beze změny.
