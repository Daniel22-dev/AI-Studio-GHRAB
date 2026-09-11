# AI Studio GHRAB 0.14.0 – automatická evidence přístupů

## Co se změnilo

- Po vytvoření podepsaného přístupu se záznam automaticky uloží do **Správa → Evidence přístupů**.
- Evidence zobrazuje jméno, interní ID, roli, aplikace, datum vydání, platnost, stav a JTI.
- Již dříve vydaný soubor lze do evidence načíst bez ručního opisování.
- Při vydání nového přístupu stejnému uživateli se starší záznam označí jako nahrazený novějším.
- Ze záznamu lze rovnou otevřít vydání nového přístupu s předvyplněnými údaji.
- Přístupy lze označit ke zneplatnění a Studio z nich vytvoří hotový `revoked-access.json`.
- Přidán export zálohy JSON a přehledu CSV.

## Bezpečnost

Evidence je uložena pouze v místním úložišti konkrétního prohlížeče správce. Do evidence se neukládá soukromý podpisový klíč ani celý přístupový token. Proto je vhodné pravidelně stáhnout zálohu evidence.

## Důležité omezení

Stažení souboru `revoked-access.json` samo přístup nezablokuje. Soubor je nutné nahradit v `src/config/revoked-access.json`, změnu odeslat na GitHub a počkat na nové nasazení.
