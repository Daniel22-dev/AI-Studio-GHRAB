# AI Studio GHRAB 0.21.53 - jednodušší reporting a online přehled v horní liště

Datum: 11. 9. 2026

## Co se mění

- **Online přehled** se přesouvá ze Správy přímo do horní lišty Studia vedle Nastavení. Je rozbalovací a zobrazuje pouze jméno a právě používanou aplikaci.
- Přehled zůstává pouze pro plného správce. V GitHub Pages režimu se žádná jména ani stav aplikace neodesílají; funkce se aktivuje až po skutečném připojení školního serveru.
- **Report** má vlastní položku v horní navigaci Studia. Není už schovaný za cestou přes Statistiky nebo tlačítko „Otevřít souhrnný report kolegů“.
- Ve **Správě** jsou oddělené karty **Statistiky používání** a **Měsíční report pro vedení**.
- Původní „Pilotní dashboard“ je uživatelsky přejmenován na **Statistiky používání** a byl z něj odstraněn zastaralý čtyřfázový rozpis pilotu.
- Stránka **Report** má nahoře rychlý rozcestník na provozní podklady, evidenci práce garanta, souhrn pro vedení a výsledný náhled/PDF. Import anonymních souhrnů kolegů je hned u provozních podkladů.

## Co se nemění

- Dvoustránkové A4 PDF z 0.21.51 zůstává zachované.
- Evidence práce garanta a soukromé poznámky zůstávají lokální; soukromá poznámka se nepřenáší do PDF ani anonymního exportu.
- Live presence heartbeat nadále posílá pouze `schema + appId`; identitu a čas určuje server z ověřené session.
- Serverový endpoint přítomnosti zůstává v předávaném balíku vypnutý (`livePresence=false`) do doby, než bude backend hotový a otestovaný.
