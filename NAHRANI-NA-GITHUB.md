# Nahrání AI Studio GHRAB 0.20.14

> Aktuální verze: **0.20.14** · etapa P3

Tato verze uzavírá sjednocení funkce **Nahlásit chybu** v celém ekosystému. AI Studio se nasazuje jako poslední, po všech samostatných aplikacích.

## Povinné pořadí

1. Korespondenční asistent 5.9.17
2. SORTIO 1.0.9
3. Lesson Hub 1.2.6
4. Diferenciátor 1.3.10
5. ACTIVA 0.5.7
6. Hodnotitel maturitních slohů 1.5.8
7. LUDUS 1.16.9
8. Generátor interaktivních testů 7.1.10
9. AI Studio GHRAB 0.20.14

## GitHub

1. Otevřete repozitář `Daniel22-dev/AI-Studio-GHRAB`.
2. Rozbalte **source ZIP**.
3. Nahrajte jeho rozbalený obsah přímo do kořene repozitáře; nevytvářejte další nadřazenou složku.
4. Potvrďte přepsání existujících souborů. Složku `dist` ze source ZIPu nenahráváte; GitHub Actions ji sestaví znovu.
5. Ověřte zelené kroky synchronizace, jednotného regresního testu reportéru, GHRAB QA a deploye.
6. Po nasazení zavřete staré karty a případnou nainstalovanou PWA, potom Studio znovu otevřete.

## Ruční smoke test

V reálném Chromu ověřte systémový výběr karty/okna/obrazovky, bezpečné umístění plovoucího panelu vedle lišty sdílení, otevření přihlášeného Gmailu a ruční přiložení staženého ZIPu.
