# Final validation — AI Studio GHRAB 0.21.64

Datum: 2026-09-13

## Důvod hotfixu

GitHub Actions po nasazení 0.21.63 již úspěšně prošly release-wave kontrolou (`10 záznamů, bez driftu`) i GARP auto-patch promotion policy. P5 R2 však následně zastavil jediný performance limit:

- `config/changelog.json`: 201 171 B
- limit `largestFileBytes`: 200 000 B
- překročení: 1 171 B

Příčinou byl monotónní růst úplné historie changelogu, nikoli chyba GARP/release-wave opravy 0.21.63.

## Oprava

- Kanonický `src/config/changelog.json` zůstává úplný a lidsky čitelný.
- Build rozděluje runtime changelog do bloků s cílovým stropem 120 000 B.
- Primární `config/changelog.json` obsahuje nejnovější blok a seznam archivních bloků.
- Stránka Katalog změn načte primární i archivní bloky a znovu je spojí v původním pořadí.
- Archivní bloky nejsou přidány do offline precache.
- P5 limit `largestFileBytes = 200000` zůstává beze změny.

## Naměřený stav 0.21.64

- P5 quality: 194/194 PASS
- `largestFileBytes`: 154 772 B / 200 000 B
- `precacheBytes`: 1 783 657 B / 1 800 000 B
- runtime changelog primary: 119 851 B, 71 položek
- runtime changelog archive-1: 82 421 B, 64 položek
- úplná historie: 135/135 položek zachováno
- ecosystem gate: PASS (9 aplikací + AI Studio, Platform 1.1.2)
- release promotion policy: PASS
- GARP security regressions: 19/19 PASS
- audit regressions: 57/57 PASS
- Studio UX regression: PASS
- hlavní interní `scripts/test.mjs`: PASS
- Platform conformance: PASS
- school-server build: PASS

## Poznámka

Pokus o lokální `npm ci` v pracovním kontejneru nedoběhl kvůli časovému limitu prostředí; testy výše používají projektové Node skripty bez externí instalace. Původní CI log potvrzuje, že dependency install v GitHub Actions proběhl a samotná chyba byla výhradně P5 `largestFileBytes`.
