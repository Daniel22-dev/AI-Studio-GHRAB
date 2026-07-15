# AI Studio GHRAB v0.16.5 — komentář k provedeným změnám

## Výchozí rozhodnutí

Jako technický základ jsem nepoužil experimentální 3D větev, ale uživatelem dodanou nenahranou verzi **0.15.0**, protože obsahovala důležité bezpečnostní, PWA a procesní opravy po hloubkovém auditu. Na tento pevnější základ jsem znovu napojil současné funkce Studia a vytvořil novou variantu spuštění aplikací ve stylu **Elegant / premium**.

## 1. Elegantní prémiová animace spuštění aplikace

Výrazný efekt se spouští pouze po skutečném kliknutí na aplikaci. Domovská obrazovka, správa, evidence, formuláře a pracovní stránky zůstávají bez zdržujících prostorových efektů.

Nová sekvence používá:

- tmavou čistou scénu;
- dvě velké průsvitné skleněné vrstvy;
- malé množství pomalu se pohybujících částic;
- tři přesně se otáčející prstence;
- jemnou skenovací linku a energetický horizont;
- klidné fáze zarovnání, ověření cíle, otevření koridoru a přechodu;
- plynulý finální záblesk místo prudkého chaotického efektu.

Plný režim trvá přibližně tři sekundy. Úsporný a vypnutý režim jsou výrazně kratší. Tlačítko **Přeskočit animaci** zůstalo zachováno.

## 2. Nabídka instalace AI Studia na PC

Na podporovaných prohlížečích se při dostupné PWA instalaci zobrazí vpravo dole samostatná karta:

- **Nainstalovat AI Studio**;
- krátké vysvětlení, že se Studio otevře jako samostatná aplikace;
- tlačítko pro instalaci;
- tlačítko pro dočasné skrytí nabídky.

Prvek se nezobrazuje:

- pokud je Studio již spuštěno jako nainstalovaná PWA;
- pokud prohlížeč instalaci nenabízí;
- po dočasném skrytí uživatelem;
- na jiných stránkách než na hlavní domovské stránce.

Po úspěšné instalaci karta automaticky zmizí.

## 3. Převzaté opravy z nenahrané verze 0.15.0

### Bezpečnost přístupů

- Přístup vyžaduje přesnou aktuální verzi předepsaného školení.
- Veřejné ověřovací klíče podporují sadu klíčů a aktivní `kid`, takže lze bezpečně provést rotaci s překryvem.
- Maximální platnost nově vydaného oprávnění je 400 dní.
- Starší oprávnění mají pouze migrační kompatibilitu, aby aktualizace neuzamkla existující uživatele bez varování.
- Soukromý podpisový klíč se ve vydavateli po deseti minutách nečinnosti automaticky zapomene a lze jej vymazat i ručně.

### PWA a aktualizace

- PWA manifest používá stabilní identitu `/AI-Studio-GHRAB/`.
- Service worker používá cache-first pro statické soubory a network-first pouze pro konfiguraci.
- Odstraněno násilné okamžité převzetí otevřených karet novým service workerem.
- Seznam souborů PWA cache se vytváří automaticky z produkčního buildu.
- Synchronizační report ve zdrojích nepředstírá provedené síťové ověření.
- Pojistná synchronizace GitHub Actions běží jednou denně, nikoli každou hodinu.

### Procesní zpevnění

- `src/config/changelog.json` je jediný zdroj changelogu a markdown se generuje automaticky.
- Pravidla aplikací a školení se neduplikují v několika konfiguračních souborech.
- Testy kontrolují formátování, bezpečnostní limity, životní cyklus klíče, PWA manifest, cache a dokumentaci.
- Historické release dokumenty zůstávají v archivu a nezaplňují kořen repozitáře.
- GitHub Actions používá přesné závislosti přes `npm ci`.

### Odolnější ochranný bootstrap

Integrační šablony načítají centrální ochranný modul odolněji. Při nedostupnosti modulu mají zobrazit srozumitelnou chybu místo prázdné stránky. Nadále platí, že čistě statický GitHub Pages portál nemůže nahradit skutečnou serverovou autorizaci.

## 4. Co jsem z předchozích experimentů záměrně nepřevzal

- naklánění celé domovské scény podle kurzoru;
- naklánění jednotlivých karet;
- malé holografické štítky mezi aplikacemi;
- výraznou 3D podlahu a dekorativní prvky, které zhoršovaly čitelnost;
- chaotické fragmenty a rychlé blikání varianty Crazy / wow.

Tyto prvky neodpovídaly zvolené prémiové variantě a při každodenním používání by překážely.

## 5. Technické ověření

Byly spuštěny:

- generování changelogu;
- kontrola formátování Prettier;
- kompletní bezpečnostní a regresní testy;
- produkční build včetně automaticky generovaného PWA precache.

Výsledek: **všechny kontroly AI Studio GHRAB prošly**.
