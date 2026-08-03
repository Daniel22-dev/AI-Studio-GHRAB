# QA report — AI Studio GHRAB v0.17.1

Datum: 2026-07-15

## Regresní kontroly

- odstranění automatického `about:blank` popupu;
- dvousekundová animace mechanických prstenců;
- následná samostatná animace vybrané aplikace;
- přechod na interní pracovní prostor `app/`;
- přítomnost vloženého rámce aplikace;
- kontrola oprávnění před vložením aplikace;
- omezení vložení na stejný důvěryhodný webový původ;
- návrat do Studia, reload, fullscreen a volitelné samostatné otevření;
- zachování instalační karty PWA vpravo dole;
- kontrola formátování, JavaScriptové syntaxe, PWA cache a produkčního buildu.

## Očekávaný průběh

1. Uživatel klikne na **Spustit aplikaci**.
2. Okno se nezmění a neotevře se bílá karta.
3. Dvě sekundy se viditelně otáčejí prstence centrální brány.
4. Ve stejném okně se zobrazí celoplošná animace konkrétní aplikace.
5. Studio přejde na interní stránku `app/?app=<id>`.
6. Aplikace se načte v pracovním prostoru Studia.
7. Tlačítko vlevo nahoře vrátí uživatele do katalogu aplikací.
