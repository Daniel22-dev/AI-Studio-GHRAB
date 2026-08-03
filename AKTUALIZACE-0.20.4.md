# AI Studio GHRAB 0.20.4

## Hlášení technické chyby

- centrální reportér používá plovoucí panel snímání vpravo dole;
- při zavření rozepsaného hlášení se uživatel rozhodne, zda koncept smazat, ponechat, nebo se vrátit;
- úplné smazání odstraní text, screenshoty, připravený ZIP i poslední stav;
- předvyplněný Gmail se otevře přímo v nové kartě v okamžiku kliknutí a ZIP se následně připraví a stáhne na původní kartě;
- vždy zůstávají záložní odkazy na Gmail, poštovní aplikaci a kopírování údajů;
- volba **Sdílet ZIP přes nabídku zařízení** se zobrazí až po vytvoření ZIP a pouze na podporovaném mobilu či tabletu; sama nic neodesílá správci;
- návod „Jak poslat správci srozumitelné hlášení bez focení monitoru“ odpovídá skutečnému workflow.

Příjemce hlášení se načítá z `config/support.json` a aktuálně je nastaven na `balaz@ghrabuvka.cz`.
