# Integrace Lesson Hub 1.2.0 do AI Studio GHRAB 0.19.0

Datum uzavření: 2. 8. 2026

## Výsledek

Lesson Hub je registrován jako osmá chráněná aplikace AI Studia GHRAB. Zůstává samostatným local-first projektem v repozitáři `lesson-hub`; AI Studio načítá jeho živý manifest, verzi, stav a manuál.

## Identita integrace

- appId: `lesson-hub`
- Lesson Hub: `1.2.0`
- AI Studio GHRAB: `0.19.0`
- školení: `LHB-01`
- verze školení: `2026-09`
- manifest: `https://daniel22-dev.github.io/lesson-hub/studio-manifest.json`
- aplikace: `https://daniel22-dev.github.io/lesson-hub/`
- manuál: `https://daniel22-dev.github.io/lesson-hub/manual/`

## Co přibylo v Lesson Hubu

- živý manifest `ai-studio-app-manifest-v1`;
- společný Access Guard pro aplikaci i manuál;
- návrat do AI Studia z manuálu;
- Studio Bridge 1.1 pro anonymní materiály `ghrab-material-v1`;
- centrální anonymní telemetrie bez obsahu výuky;
- výstupní typy `lesson-plan`, `lesson-record`, `material-record`, `material-import` a `backup-export`;
- aktualizovaný interaktivní manuál s částí Propojení s AI Studiem.

Otevření manuálu nezvyšuje statistiku používání aplikace. Telemetrie neobsahuje názvy skupin, témata hodin, poznámky, studentské údaje ani obsah materiálů.

## Co přibylo v AI Studiu

- osmá karta Lesson Hubu mimo výchozí Top 4;
- živý zdroj manifestu a offline fallback;
- lokální ikona;
- přístupová politika a školení `LHB-01`;
- témata v Centru manuálů a otevření živého manuálu;
- povolené anonymní technické výstupy;
- Lesson Hub v pilotním reportu, diagnostice, changelogu a QA;
- aktualizace textů a checklistů ze sedmi na osm aplikací.

## Výsledky kontrol

### Lesson Hub 1.2.0

- úplné aplikační, serverové a integrační testy: PASS;
- technická QA: PASS, 0 nálezů;
- bezpečnostní QA: PASS, 0 nálezů;
- PWA QA: PASS;
- kombinatorická QA: PASS, pairwise 100 %;
- kritická workflow: 25/25 PASS;
- vizuální scénáře: 61/61 PASS;
- headless smoke test: 5/5 PASS.

### AI Studio GHRAB 0.19.0

- doménový test registru a build: PASS;
- technická QA: PASS, 0 nálezů;
- bezpečnostní QA: PASS, 0 nálezů;
- PWA QA: PASS;
- kombinatorická QA: PASS, pairwise 100 %;
- integrační kritické scénáře: 5/5 PASS v místním Chromium smoke testu;
- integrační vizuální scénáře: 13/13 PASS ve všech definovaných viewpor­tech;
- karta Lesson Hubu, uzamčený stav, katalog a Centrum manuálů: PASS.

Čisté `npm ci`, Prettier a oficiální Node Playwright běh AI Studia musí potvrdit GitHub Actions, protože místní pracovní registr neposkytl potřebné balíčky. GitHub workflow je již instaluje z veřejného npm registru a při chybě nasazení zablokuje.

## Povinné pořadí nasazení

1. Nahrát Lesson Hub 1.2.0 do repozitáře `lesson-hub`.
2. Počkat na zelený GitHub Actions běh.
3. Ověřit živý `studio-manifest.json` a `/manual/`.
4. Teprve potom nahrát AI Studio GHRAB 0.19.0 do repozitáře `AI-Studio-GHRAB`.
5. Počkat na zelený běh „Sync, certify and deploy AI Studio GHRAB“.
6. V anonymním okně ověřit osm karet, Lesson Hub v katalogu, uzamčený stav a Centrum manuálů.

Při pilotu používat anonymizovaná data. Server Lesson Hubu zůstává volitelný a ve výchozím stavu vypnutý.
