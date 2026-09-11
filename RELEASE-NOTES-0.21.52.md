# AI Studio GHRAB 0.21.52 - živá přítomnost uživatelů připravená pro školní server

Datum: 11. 9. 2026

## Co se mění

- Ve Správě Studia je připraven nový panel **Kdo je právě online a kterou aplikaci používá**.
- Panel je dostupný pouze plnému správci; role zástupce správce ani běžný učitel jej nevidí.
- Centrální `platform-runtime` umí po skutečné aktivaci školního serveru posílat krátký heartbeat ze všech chráněných aplikací, které používají společný `app-guard` Studia.
- Heartbeat obsahuje pouze `appId`. Jméno, e-mail, uživatelský identifikátor ani klientský čas se neposílají; identitu i rozhodný čas určí server z ověřené školní session a okamžiku přijetí požadavku.
- Aktivní je pouze viditelná a zaměřená karta. Po přepnutí na jinou aplikaci odešle nový focus nový heartbeat, takže správce vidí naposledy aktivní aplikaci.
- Klient očekává serverový TTL přibližně 120 sekund. Po jeho překročení uživatel z online přehledu zmizí.

## Privacy a bezpečnost

Živá přítomnost není docházka ani evidence práce. Klient neukládá historii přechodů mezi aplikacemi a neposílá prompt, URL podstránky, materiál, studentská data, IP adresu ani zařízení. Správcovský klient navíc z odpovědi serveru propouští pouze `displayName`, `appId` a `lastSeenAt`.

POST heartbeat používá serverovou session a request-token/CSRF hlavičky. GET seznamu musí server povolit pouze plnému správci. Podrobný backend kontrakt je v `docs/LIVE-PRESENCE-SERVER-CONTRACT.md`.

## Výkonový rozpočet

Po zeštíhlení přidává živá přítomnost přibližně 12,9 kB nemediálního buildu proti 0.21.51. Dosavadní limit 2,30 MB by ponechal jen desítky bajtů rezervy, proto je `distBytes` transparentně posunut na 2,31 MB (+0,43 %). Kritická vstupní cesta zůstává pod původním limitem 500 kB a heartbeat modul se do společného `platform-runtime` načítá dynamicky jen při skutečně aktivním serverovém profilu.

## Serverless a aktivace

V GitHub Pages režimu je schopnost pouze připravena a **neprovádí žádný síťový request na presence endpoint**. V deployment konfiguraci zůstává `features.livePresence = false`.

Pro skutečné zapnutí musí být současně hotový serverový endpoint, `authMode = server-session`, `features.schoolServerConnected = true`, `features.livePresenceReady = true` a `features.livePresence = true`. Do té doby UI pravdivě zobrazuje, že je funkce připravena, ale nepřipojena.

## Zachováno z 0.21.51

Dvoustránkový měsíční reporting pro vedení zůstává beze změny: první strana obsahuje provozní využití aplikací, druhá práci garanta a manažerský souhrn.
