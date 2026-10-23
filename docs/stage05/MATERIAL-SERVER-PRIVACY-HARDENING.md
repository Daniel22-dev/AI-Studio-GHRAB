# Stage05 — sdílená materiálová knihovna: server-side privacy seam hardening

**Datum:** 2026-10-23. **Prostředí:** `candidate` 0.21.255, nikoliv produkce. Žádný server není aktivován.

## Původní nalezené riziko

`src/library/material-service.js` měl při publikování materiálu do budoucí komisní knihovny i při forkování ze serveru kontrolu pouze `provenance.containsPersonalData === true`. Materiál se zapomenutým příznakem, e-mailovou adresou ve `sourceText` nebo vloženým rosterem v `content.metadata` mohl překročit klientskou hranici, zatímco material-flow Bridge takové položky správně odmítá. Byl to **rozpor v kontraktech** Stage05 versus budoucí server seam. Neříká to nic o již přenesených údajích, protože konfigurace má `schoolServerConnected:false` a sdílení na GitHub Pages zůstává neaktivní.

## Oprava

1. `assertSafeMaterial` používá standardní `inspectOutboundMaterial` s týmiž pravidly pro osobní údaje a aktivní obsah jako Bridge. Ověřuje i explicitní `containsPersonalData:false`, nikoliv pouze `!==true`.
2. Server API požadavky se směrují výhradně na **stejný origin jako Studio** a pod konfigurovaný prefix API. Cizí `apiBaseUrl`, cizí absolutní endpoint a `../` únik se odmítají **před** voláním `fetch`.
3. Přidány pozitivní a negativní scénáře: chybějící příznak, e-mail, roster, HTML `onerror`, úspěšné publikování anonymního materiálu, nebezpečný serverový fork, cizí origin, escape prefixu API, odpojený server.

## Co opravou nevzniká

- Není vytvořen backend, centrální databáze, uživatelské účty ani možnost sdílet materiály mezi učiteli na GitHub Pages.
- Serverové REST API bude vyžadovat vlastní autentizaci, autorizaci rolí, kontrolu příslušnosti ke komisi, audit log a retenci. Klientská filtrace není bezpečnostní hranice proti úmyslnému útočníkovi.
- Aktualizace se nesmí označit jako bezpečně nasazená, dokud nebude potvrzena v CI na přesném commit SHA a v P5 po začlenění do `candidate`.

**Závěr:** změna sjednocuje privacy preflight centrálního Material Flow s připraveným sdíleným serverovým rozhraním. Produkční NO-GO etapy 05 trvá do autorizovaného 6/6 E2E.
