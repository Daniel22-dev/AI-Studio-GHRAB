# Bezpečnostní hranice serverless verze

## Co portál dělá

- načítá pouze vlastní statické soubory,
- otevírá samostatné aplikace přes HTTPS odkazy,
- ukládá do prohlížeče jen jazyk, vzhled a počet spuštění aplikací z portálu,
- umožňuje uživateli lokální data vymazat nebo exportovat.

## Co portál nedělá

- nemá databázi ani backend,
- nepřihlašuje uživatele,
- neukládá osobní údaje,
- neukládá obsah testů, e-mailů nebo pracovních listů,
- neobsahuje společný API klíč,
- neodesílá analytiku třetím stranám,
- nezná výsledky žáků ani dokončené úkoly.

## Pro pilot

Do nástrojů se nesmí vkládat identifikovatelné zdravotní, kázeňské nebo jiné citlivé údaje. Práce žáků a školní korespondence musí být před odesláním externí AI službě anonymizována. Každý výstup AI musí před použitím zkontrolovat učitel.

## Budoucí serverová verze

Před zavedením účtů, databáze nebo centrálního API je nutné vyřešit:

- správce systému a odpovědnosti,
- přihlášení školní identitou,
- minimalizaci a dobu uchování dat,
- oddělenou databázi,
- zálohování a obnovu,
- auditní logy,
- bezpečnou správu tajemství,
- schválený provozní a aktualizační proces.
