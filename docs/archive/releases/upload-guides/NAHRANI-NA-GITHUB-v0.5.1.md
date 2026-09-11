# Přesný postup nahrání AI Studio GHRAB 0.5.1 na GitHub

## Důležité pořadí

Nejdříve aktualizujte dílčí aplikace, potom AI Studio. Jinak by Studio mohlo krátce načíst staré manifesty s nevhodným statusem.

## 1. Generátor interaktivních testů

1. Rozbalte `generator-testu-v7.0.5-AI-Studio-ready-v0.5.1.zip`.
2. Otevřete repozitář `generator-testu`.
3. Zvolte **Add file → Upload files**.
4. Nahrajte **obsah rozbalené složky**, ne složku samotnou.
5. Potvrďte commit například `AI Studio bridge 1.1 a pilotní manifest`.
6. V **Actions** počkejte na zelený build a deploy.

## 2. Školní aplikace

### Jednorázové odstranění starých sestavených souborů

V existujícím repozitáři `Skolni-aplikace` ručně smažte, pokud tam stále jsou:

- kořenovou složku `diferenciator/`,
- kořenovou složku `korespondencni-asistent/`,
- kořenový `index.html`,
- `Diferenciator.html`, `diferenciator.html`,
- `Korespondencni-asistent.html`, `korespondencni-asistent.html`,
- kořenový `.nojekyll`.

Tyto soubory jsou staré sestavené kopie. Nasazení probíhá výhradně z `dist/` vytvořeného GitHub Actions.

### Nahrání nové verze

1. Rozbalte `Skolni-aplikace-v1.0.2-4.0.2-AI-Studio-ready-v0.5.1.zip`.
2. Nahrajte obsah do kořene repozitáře `Skolni-aplikace`.
3. Commit: `AI Studio bridge 1.1, pilotní manifesty a čistý zdrojový balík`.
4. Počkejte na zelený build a deploy.
5. Ověřte obě adresy aplikací.

## 3. LUDUS

1. Rozbalte `Ludus-v1.14.2-AI-Studio-ready-v0.5.1.zip`.
2. Nahrajte obsah do kořene repozitáře `Ludus`.
3. Commit: `AI Studio bridge 1.1 a pilotní manifest`.
4. Počkejte na zelený build a deploy.

## 4. AI Studio GHRAB

1. Rozbalte `AI-Studio-GHRAB-v0.5.1-GitHub.zip`.
2. Otevřete repozitář `AI-Studio-GHRAB`.
3. Nahrajte celý obsah rozbalené složky přímo do kořene repozitáře.
4. Commit: `Aktualizace AI Studio GHRAB v0.5.1`.
5. V `Settings → Pages` ponechte **Source: GitHub Actions**.
6. V **Actions** počkejte na zelené workflow `Sync, validate and deploy AI Studio GHRAB`.

## 5. Ověření po nasazení

1. Otevřete Studio a proveďte tvrdé obnovení `Ctrl + F5`.
2. Otevřete **Automatizace**. Cílem je 4/4 živých manifestů; dočasný režim `mixed` nebo `fallback` je bezpečný, ale je třeba zjistit příčinu.
3. Otevřete **Kontrola Studia** a spusťte všechny testy.
4. Zkontrolujte, že karty neobsahují označení „Produkční verze“; mají používat pilotní formulace.
5. Ověřte mobilní přepínač CZ/EN.
6. V Pracovním toku změňte vzorový materiál, obnovte stránku a ověřte obnovení konceptu.
7. Vyzkoušejte předávku do všech čtyř aplikací.
8. V části Pilot stáhněte JSON a CSV a ověřte, že neobsahují názvy materiálů, prompty, text ani volné poznámky.

## 6. Okamžitá synchronizace

Ve zdrojových repozitářích nastavte secret `AI_STUDIO_DISPATCH_TOKEN` podle `AUTOMATIZACE-GITHUB.md`. Bez tokenu proběhne záložní synchronizace jednou denně. Po více než 60 dnech neaktivity zkontrolujte v GitHub Actions, zda plánované workflow nebylo automaticky vypnuto.
