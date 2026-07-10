# Nahrání AI Studio GHRAB 0.2.0 na GitHub

## Doporučené pořadí

Nejdříve nahraj aktualizované balíčky aplikací a až poté Studio:

1. `generator-testu-main`
2. `Skolni-aplikace-main`
3. `Ludus-main`
4. `AI-Studio-GHRAB`

Důvod: první běh Studia už pak načte nové manifesty a správná čísla verzí.

## Nahrání každého ZIPu přes web GitHubu

1. ZIP stáhni a rozbal v počítači.
2. Otevři příslušný repozitář na GitHubu.
3. Klikni `Add file → Upload files`.
4. Do okna přetáhni **obsah rozbalené složky**, ne samotnou nadřazenou složku.
5. Počkej na načtení souborů.
6. Dole zvol `Commit changes`.
7. Otevři záložku `Actions` a vyčkej na zelený výsledek.

## Jednorázové nastavení GitHub Pages

V každém repozitáři:

1. `Settings`
2. `Pages`
3. `Build and deployment`
4. `Source: GitHub Actions`

U Studia by následně měla vzniknout adresa:

`https://daniel22-dev.github.io/AI-Studio-GHRAB/`

## První ověření

V AI Studiu otevři stránku **Automatizace**. Měla by ukázat:

- Generátor 7.0.4,
- Diferenciátor 1.0.1,
- LUDUS 1.14.1,
- Korespondenční asistent 4.0.1.

Pokud je některý zdroj označen jako záložní:

1. zkontroluj, že jeho vlastní GitHub Action skončila zeleně,
2. v repozitáři AI Studia otevři `Actions`,
3. vyber `Sync, validate and deploy AI Studio GHRAB`,
4. klikni `Run workflow`.

## Důležité

Aplikace zůstávají ve svých původních repozitářích. AI Studio je nový samostatný repozitář a pouze na ně odkazuje.
