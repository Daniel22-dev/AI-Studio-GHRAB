# Nahrání AI Studio GHRAB 0.21.64

> Aktuální verze: **0.21.64** · etapa P5

> 0.21.64 je P5 performance hotfix: changelog se při buildu automaticky dělí do menších on-demand bloků, takže růst historie už neblokuje release limit 200 kB.

> **PŘED NASAZENÍM:** aktuální release musí projít standardní P5/access gate v GitHub Actions. Pro produkční použití musí být zelené i povinné browserové kontroly CI; do uzavření těchto gate se nemají používat reálná studentská data.

Performance gate zůstává fail-closed. Kvůli legitimnímu nárůstu nemediálního UI obsahu je pouze `distBytes` budget úzce posunut z 2 380 000 na 2 400 000 B; kritická vstupní cesta, precache, největší soubor a runtime limity se nezvyšují.

## Povinné pořadí

1. Korespondenční asistent 5.10.25
2. SORTIO 1.1.17
3. Lesson Hub 1.2.22
4. Diferenciátor 1.3.46
5. ACTIVA 0.5.27
6. Hodnotitel maturitních slohů 1.5.25
7. LUDUS 1.16.23
8. Generátor interaktivních testů 7.1.25