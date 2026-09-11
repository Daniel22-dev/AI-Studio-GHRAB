# AI Studio GHRAB 0.21.54

## API a spotřeba

- Ve Správě je nové full-admin tlačítko **API a spotřeba**.
- Připravený přehled zobrazuje skutečné OpenAI API náklady, měsíční rozpočet, využití, požadavky, tokeny a rozpad podle projektů, aplikací a modelů.
- Do připojení školního serveru se nezobrazují odhady ani falešná čísla.
- OpenAI administrátorský klíč zůstává pouze na serveru; prohlížeč pracuje jen s agregovanými daty.

## Měsíční report

- Stránka Report používá stejný serverový zdroj API spotřeby.
- Druhá strana dvoustránkového PDF obsahuje automatický OpenAI API box se skutečnou útratou, rozpočtem, využitím a počtem požadavků.
- Ruční pole dalších přímých AI nákladů zůstává zachované pro ostatní placené služby.

## Serverová připravenost

- Přidán kontrakt `docs/API-USAGE-SERVER-CONTRACT.md`.
- Endpoint je připraven jako `admin/api-usage`, ale feature flag `apiUsage` zůstává vypnutý, dokud nebude nasazen skutečný backend.
- Klient používá same-origin session, `no-store` a 30sekundovou paměťovou cache; finanční data se neukládají do localStorage/sessionStorage.

## Výkon a velikost

- Celkový `distBytes` budget byl kvůli nové stránce upraven pouze z 2 310 000 na 2 350 000 B; `entryCriticalBytes` a `precacheBytes` zůstávají beze změny.
