# QA report — AI Studio GHRAB 0.6.2

## Rozsah vydání

Verze 0.6.2 připojuje Hodnotitel maturitních slohů 1.3.1 jako pátou chráněnou aplikaci ekosystému.

## Ověřené oblasti

- registr obsahuje přesně pět unikátních aplikací;
- `essay-evaluator` je ve výchozím Top 4;
- LUDUS zůstává dostupný v katalogu a lze jej připnout;
- živý zdroj manifestu má správnou veřejnou URL;
- offline fallback obsahuje verzi 1.3.1 a lokální ikonu;
- přístupová politika obsahuje školení `HOD-01`;
- oprávnění obsahuje claim `app.essay-evaluator.use` a rizikovou úroveň `high`;
- vydavatel přístupů načítá novou aplikaci dynamicky z politiky;
- PWA cache obsahuje ikonu a integrační bootstrap Hodnotitele;
- synchronizace manifestů zachovává lokální ikonu portálu;
- GitHub workflow přijímá událost `app-updated`;
- sestavení neobsahuje soukromý klíč, přístupový soubor ani známý formát API klíče;
- všechny interní odkazy, JSON soubory, JavaScriptové soubory a precache položky prošly automatickou validací;
- produkční `dist/` byl úspěšně vytvořen.

## Výsledek

`npm run sync:offline` — PASS  
`npm test` — PASS  
`npm run build` — PASS

## Omezení dostupného testu

V pracovním prostředí nebylo provedeno skutečné přihlášení pomocí uživatelova soukromého podpisového klíče ani živé nasazení na GitHub Pages. Tyto kroky je nutné ověřit po nahrání balíků.
