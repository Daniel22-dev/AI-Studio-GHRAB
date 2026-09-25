# Nahrání AI Studio GHRAB 0.21.107

> Aktuální verze: **0.21.107** · etapa P5

> 0.21.82 opravuje source-candidate gate: Generátor zůstává ručně přijatý na 7.1.28 a repository kandidát 7.1.30 se bez úspěšného deploymentu nepovýší ani nezablokuje release Studia.

## Jednorázová migrace `dist-school-server/`

> Důležité od 0.21.73: `dist-school-server/` je reprodukovatelný generovaný artefakt a ve zdrojovém balíku už není. Pokud jej ale stávající GitHub repozitář už trackuje, obyčejný webový upload nových souborů ho **nesmaže**. Při tomto release musí být adresář jednorázově odstraněn v samostatném/stejném commitu (např. `git rm -r dist-school-server`); `.gitignore` zabrání jeho opětovnému přidání. Potřebný školní balík se kdykoli znovu vytvoří přes `npm run build:school-server`.

## Povinné pořadí

1. Korespondenční asistent 5.10.29
2. SORTIO 1.1.20
3. Lesson Hub 1.2.24
4. Diferenciátor 1.3.49
5. ACTIVA 0.5.28
6. Hodnotitel maturitních slohů 1.5.29
7. LUDUS 1.16.29
8. Generátor interaktivních testů 7.1.50
