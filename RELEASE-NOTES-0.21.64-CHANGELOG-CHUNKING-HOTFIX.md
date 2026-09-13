# AI Studio GHRAB 0.21.64 — changelog chunking hotfix

Verze **0.21.64** opravuje P5 performance gate, který po růstu katalogu změn překročil limit `largestFileBytes` o 1 171 B.

## Příčina

`dist/config/changelog.json` obsahoval kompletní historii Studia a po minifikaci dosáhl 201 171 B při limitu 200 000 B. Soubor už nebyl součástí precache, ale obecný P5 limit jednoho runtime souboru se na něj správně stále vztahoval.

## Oprava

- Zdrojový `src/config/changelog.json` zůstává jediným úplným a čitelným zdrojem historie.
- Build rozdělí runtime historii deterministicky do bloků s bezpečnou rezervou pod P5 limitem.
- `config/changelog.json` obsahuje nejnovější blok a seznam archivních bloků.
- Stránka `changelog/` načte všechny bloky a zachová úplnou historii i pořadí.
- Archivní bloky vznikají až po sestavení seznamu offline precache, takže changelog zůstává on-demand obsah.
- Limit `largestFileBytes = 200000` nebyl zvýšen.

## Bezpečnostní a funkční dopad

Žádná změna oprávnění, GARP politiky, release-wave politiky ani aplikačních dat. Jde pouze o distribuci read-only historie změn do více runtime souborů.
