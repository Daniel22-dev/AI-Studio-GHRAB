# Přesný postup nahrání AI Studio GHRAB 0.21.27 na GitHub

> Aktuální verze: **0.21.27** · etapa P5

## Předpoklady

Nejprve musí být nasazeny KS 5.10.3, SORTIO 1.0.12, Lesson Hub 1.2.9, Diferenciátor 1.3.13, ACTIVA 0.5.10, Hodnotitel 1.5.11, LUDUS 1.16.13 a Generátor 7.1.13. Jejich lokální reportér vypíná centrální instanci přes `errorReporter: false`.

## Nahrání

1. Stáhněte a rozbalte `AI-Studio-GHRAB-v0.21.27-GitHub.zip`.
2. Do kořene repozitáře `AI-Studio-GHRAB` nahrajte přímo všechny soubory a složky z rozbaleného archivu.
3. Commit pojmenujte například `AI Studio 0.21.27 – stabilizace screenshot QA`.
4. Vyčkejte na dokončení GitHub Actions. Workflow instaluje závislosti, synchronizuje manifesty, spustí regresi reportéru, celý GHRAB QA release gate, sestaví `dist` a až poté nasadí GitHub Pages.

## Kontrola po nasazení

- `dist/build-info.json`, PWA manifest a service worker musí uvádět 0.21.27.
- Registr musí uvádět všech osm aktuálních verzí aplikací.
- V každé aplikaci musí být právě jedno tlačítko **Nahlásit chybu**.
- Hlavní akce musí znít **Stáhnout ZIP a otevřít Gmail** a před kliknutím obsahovat příjemce `balaz@ghrabuvka.cz`.
- Ověřte systémový picker snímání, pořízení snímku přímo v dialogu i z plovoucího panelu, otevření nové karty Gmailu a ruční přiložení ZIPu.
