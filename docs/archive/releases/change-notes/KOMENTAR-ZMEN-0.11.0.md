# AI Studio GHRAB 0.11.0 - brána a hlášení chyb

## Aktivační sekvence
- Po kliknutí na odemčenou aplikaci se vybraná karta zvýrazní.
- Prstence, orbity a energetický vír centrální brány se na 2,4 sekundy zrychlí.
- Stavový štítek oznámí, která aplikace se otevírá.
- Poté se aplikace otevře v nové kartě; pokud ji prohlížeč zablokuje, použije se bezpečný přechod v aktuální kartě.
- Režimy omezeného pohybu používají kratší a klidnější přechod.

## Hlášení chyb
- Centrální `app-guard.js` vloží po ověření přístupu do každé chráněné aplikace stejné tlačítko `Nahlásit chybu`.
- Manuály a nechráněné studentské exporty tlačítko nedostávají.
- Učitel může povolit snímání obrazovky, pořídit až pět snímků nebo nahrát obrázky z disku.
- Každý snímek lze před odesláním začernit; nástroj výslovně upozorňuje na anonymizaci.
- Vznikne jeden ZIP obsahující `hlaseni.txt`, omezené technické údaje JSON, upozornění k anonymizaci a zvolené JPEG snímky.
- Aplikace otevře předvyplněný e-mail na `balaz@ghrabuvka.cz`; uživatel ručně přiloží právě stažený ZIP a odešle.
- Pokud zařízení podporuje Web Share se soubory, lze balíček předat rovnou systémové nabídce sdílení.

## Soukromí
- Neukládají se prompty, texty materiálů ani identita uživatele.
- URL je zapsána bez query parametrů a fragmentu.
- Snímky vzniknou pouze po vědomém úkonu uživatele.
- Obsah screenshotu může přesto obsahovat osobní údaje, proto je součástí nástroje redakce a povinné upozornění.
