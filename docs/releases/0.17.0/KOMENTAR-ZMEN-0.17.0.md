# AI Studio GHRAB v0.17.0 — čistý základ a dvoufázové spuštění

## Použitý základ

Výchozím stavem je uživatelem dodaná aktualizovaná verze 0.15.0 před 3D a holografickými experimenty. Zachovává auditní, bezpečnostní a provozní opravy této verze.

## Co bylo odstraněno / nepřevzato

- naklánění karet a centrální scény podle kurzoru;
- holografické štítky kolem aplikací;
- prostorová podlaha a dekorace, které zhoršovaly čitelnost;
- efekty ve Správě, evidenci, formulářích a pracovních stránkách.

## Dvoufázové spuštění aplikace

Po kliknutí na **Spustit aplikaci** proběhne přesně tento sled:

1. **První fáze — centrální brána**
   - v plném režimu trvá 2 sekundy;
   - tři mechanické prstence se otáčejí různými směry;
   - postupně se aktivují zámky kolem obvodu;
   - uživatel stále vidí domovskou stránku a skutečnou bránu AI Studia.

2. **Druhá fáze — samostatná animace aplikace**
   - otevře se přes celou obrazovku až po dokončení navolení brány;
   - používá ikonu, název a hlavní barvu vybrané aplikace;
   - obsahuje elegantní prstence, světelné vrstvy, ověření cíle a otevření koridoru;
   - lze ji přeskočit tlačítkem **Přeskočit animaci**.

3. **Otevření aplikace**
   - cílové okno se rezervuje už při kliknutí, aby jej prohlížeč nezablokoval;
   - po dokončení nebo přeskočení animace se načte konkrétní aplikace.

## Instalace AI Studia na PC

- na domovské stránce se na počítači vpravo dole zobrazuje karta **Nainstalovat AI Studio**;
- pokud Chrome nebo Edge zpřístupní systémovou instalační výzvu, tlačítko ji otevře přímo;
- pokud výzva ještě není dostupná, tlačítko zobrazí přesný postup přes ikonu v adresním řádku;
- v již nainstalované PWA se karta nezobrazuje;
- uživatel ji může zavřít a na 30 dní skrýt.

## GitHub Actions

Součástí jsou i opravy dřívějších problémů s nasazením:

- veřejný registr `registry.npmjs.org`;
- Node.js 22;
- časový limit instalace;
- automatické formátování `apps.generated.json` a `sync-report.json` po synchronizaci.
