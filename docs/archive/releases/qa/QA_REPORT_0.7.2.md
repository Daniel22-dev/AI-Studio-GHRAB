# QA report — AI Studio GHRAB 0.7.2

Datum kontroly: 12. 7. 2026

## Ověřeno

- katalog manuálů již nepoužívá `target="_blank"` a vede na interní stránku v rozsahu PWA;
- interní prohlížeč přijímá pouze známé ID aplikace z centrálního registru;
- před načtením rámce znovu kontroluje `hasAppAccess` pro konkrétní aplikaci;
- uzamčený uživatel nedostane adresu manuálu do rámce a je odkázán na stránku Můj přístup;
- povoleny jsou pouze HTTPS manuály z produkčního originu GitHub Pages;
- rámec má povolený fullscreen a zachovává interaktivitu manuálu;
- interní prohlížeč, skript a styl jsou v PWA precache;
- CSP, lokální odkazy, syntaxe JavaScriptu, verze manifestu, registry, oprávnění a build prošly automatickou kontrolou;
- build AI Studia 0.7.2 byl vytvořen úspěšně;
- kompletní `npm test`: PASS.

## Poznámka k chování

Nouzové tlačítko **Otevřít zvlášť** zůstává záměrně k dispozici pro případ, že firemní nastavení prohlížeče nebo výpadek vloženého načítání zabrání zobrazení rámce. Běžná hlavní cesta z katalogu však zůstává uvnitř nainstalovaného AI Studia.
