# AI Studio GHRAB 0.20.17 — oprava spouštění aplikací v pracovním prostoru

Datum: 9. 8. 2026

## Opravený problém

Při otevření Korespondenčního asistenta přes pracovní prostor AI Studia se mohl objevit panel „Přístup nelze ověřit“, i když byl podepsaný přístup platný a Studio samo aplikaci povolilo.

Příčinou byl závod při startu chráněné satelitní aplikace. Satelit načítá vlastní GHRAB Platform pomocí odloženého skriptu a současně importuje centrální `app-guard.js` z AI Studia. Pokud byl přístupový guard rychlejší než lokální platformní skript, mohl vytvořit mezistav `GHRAB_PLATFORM`, ve kterém ještě nebyla funkce `unlockProtectedScripts()`. Bootstrap satelitu pak vyhodnotil start jako chybu.

## Oprava

- centrální `app-guard.js` před startem chráněné aplikace čeká na skutečnou dostupnost `GHRAB_PLATFORM.unlockProtectedScripts()`;
- čekání se používá pouze tam, kde stránka obsahuje chráněný aplikační skript;
- kontroluje se přítomnost lokálního platformního loaderu;
- guard reaguje na `ghrab:platform-ready`, `load`, `error` a současně používá krátký polling jako ochranu proti ztracené události;
- čekání má pevný limit a diagnostický stav `waiting / ready / failed`;
- přidán samostatný regresní test se záměrně opožděnou platformou;
- pracovní prostor před vložením aplikace zkontroluje a aktivuje čekající aktualizaci service workeru Studia, aby přechod ze starší verze nepoužil starý guard;
- `access/app-guard.js`, `access/access-control.js` a `access/platform-runtime.js` jsou vyřazeny ze statického PWA cache-first režimu a načítají se jako runtime zdroje;
- registr Korespondenčního asistenta byl aktualizován z 5.9.17 na skutečně nasazenou verzi 5.9.20.

## Dopad

Oprava je centrální v AI Studiu. Korespondenční asistent není nutné kvůli tomuto problému znovu vydávat: jeho produkční bootstrap už načítá `app-guard.js` přímo z `/AI-Studio-GHRAB/access/`, takže po nasazení AI Studia 0.20.17 automaticky použije opravený startovací mechanismus. Stejná ochrana platí i pro další chráněné satelitní aplikace používající centrální guard.

## CI stabilizace po prvním uploadu 0.20.17

První samostatný P3/P5 GitHub Actions běh prošel všemi statickými platformními a quality kontrolami, ale zastavil se ještě před browser asercemi v `qa-p3-browser.mjs` na `Chromium debug timeout`. Šlo o chybu testovací infrastruktury: test ručně spouštěl prohlížeč přes `--remote-debugging-port` a čekal na CDP HTTP endpoint, přestože projekt už používá přesně připnutý Playwright.

Browser gate nyní používá `playwright.chromium.launch()` přímo. Tím Playwright sám řídí kompatibilní spuštění staženého Chromium/Chrome for Testing a test už nezávisí na ručně vytvořeném debug portu. Samotné P3 kontroly přístupnosti, dialogu, focus trapu, výkonu a lazy modulu zůstaly zachované; změnil se pouze způsob připojení k prohlížeči.
