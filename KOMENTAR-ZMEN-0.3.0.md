# Komentář ke změnám AI Studio GHRAB 0.3.0

## Východisko

Verze 0.3.0 pokračuje z preferované verze 0.2.1. Nebyla založena na následné variantě 0.2.2. Proto zůstalo zachováno původní automatické přizpůsobení výkonu zařízení, možnost ručně zvolit plné, úsporné nebo vypnuté animace a samostatné tlačítko fullscreen.

## Fáze 2 — společná pravidla a kvalita

Studio nyní používá jednotný datový formát `ghrab-material-v1`, společný systém identifikátorů, verze materiálu a stav kvality. Stav kvality má čtyři úrovně:

1. návrh s podporou AI,
2. zkontrolováno učitelem,
3. vyzkoušeno ve výuce,
4. ověřeno předmětovou komisí.

Vyšší stav není jen dekorativní štítek. Centrum bezpečnosti vysvětluje minimální kontrolní kroky a upozorňuje, že zásadní změna materiálu ruší předchozí vyšší ověření.

## Fáze 3 — propojený pracovní tok

Přibyla samostatná stránka **Pracovní tok**. Učitel může:

- vytvořit materiál,
- zadat předmět, ročník, úroveň, jazyk a cíle,
- vložit zdrojový text,
- přidat strukturované úlohy,
- provést základní kontrolu úplnosti,
- uložit rozpracovaný materiál lokálně,
- stáhnout `.ghrab.json`,
- předat materiál cílové aplikaci.

Předávka používá `ghrab-handoff-v1`, platí 30 minut a po převzetí se smaže. Současně se stáhne soubor jako bezpečná záloha.

## Integrace Generátoru 7.0.5

Generátor převezme:

- název materiálu,
- ročník nebo skupinu,
- předmět a téma,
- jazyk,
- CEFR úroveň,
- výukové cíle,
- zdrojový text,
- strukturované úlohy a klíče.

Po importu zobrazí viditelný banner a odkaz zpět do Studia. Současně byla dokončena dříve rozpracovaná modularizace: nahrazeny byly dva původní monolitické soubory malými migračními tombstones, které duplicitně deklarovaly části kódu. Tím zmizela reálná kolize `SHARED_SCORING_JS`, zmenšil se produkční HTML build a kompletní testovací brána nyní prochází.

Z veřejného přístupového manifestu bylo odstraněno konkrétní jméno učitele a nahrazeno anonymním označením. Hash přístupového kódu zůstal zachován.

## Integrace Diferenciátoru 1.0.2

Diferenciátor převezme:

- zdrojový text a úlohy,
- předmět,
- téma,
- cílovou skupinu,
- úroveň,
- výukové cíle.

Po převzetí otevře konfigurační část a připraví pokyn, aby všechny varianty zachovaly společný cíl a lišily se mírou podpory a kognitivní náročností.

## Fáze 4 — LUDUS 1.14.2

LUDUS nyní obsahuje tlačítko **Import z AI Studia** a umí dvě cesty:

- automaticky převzít krátkodobý handoff,
- ručně načíst `.ghrab.json` nebo `LUDUS_CONTENT v2`.

Podporované typy úloh se převedou na stanice, vyberou se bezpečné výchozí motivy a připraví se hratelný engine, třídní soutěž i lesson pack bez dalšího volání AI. Nepodporovaný formát je odmítnut s čitelnou chybou.

## Integrace Korespondenčního asistenta 4.0.2

Korespondenční asistent nepřebírá žákovské výsledky ani osobní údaje. Z anonymního materiálu vytvoří strukturovaný podklad obsahující téma, předmět, skupinu, cíle a zdroj. Učitel následně určí adresáta, účel a konečnou podobu sdělení.

## Fáze 5 — pilotní měření a report

Pilotní sekce byla změněna z prostého počítadla spuštění na skutečný 12týdenní dashboard. Lze zaznamenat:

- použitou aplikaci,
- výsledek práce,
- orientační úsporu času,
- užitečnost,
- anonymní poznámku.

Report pro vedení zobrazuje KPI, používání jednotlivých aplikací, pracovní toky, kvalitu materiálů a anonymní případové studie. Data lze exportovat do JSON a CSV nebo vytisknout do PDF. Nezaznamenává se obsah materiálů ani jména uživatelů.

## Fáze 6 — prezentační režim

Demo dostalo automatické přehrávání, progresní lištu, klávesové ovládání a poznámky řečníka. Je tak použitelné jako pětiminutová řízená prezentace pro vedení školy, kolegy, rodiče nebo zřizovatele. Na konci lze přejít přímo do reportu dopadu.

## Knihovna

Knihovna už není jen statická galerie. Materiál lze:

- filtrovat a vyhledat,
- otevřít v pracovním toku,
- uložit do místního pracovního prostoru,
- stáhnout,
- importovat z vlastního souboru.

V serverless verzi jde stále o lokální pracovní prostor. Sdílené nahrávání kolegy bude až součástí serverové databázové etapy.

## Automatizace a budoucí aktualizace

Každá aplikace při buildu vytváří `studio-manifest.json` s aktuální verzí a kompatibilitou. Studio je kontroluje hodinově nebo okamžitě přes `repository_dispatch`, pokud je nastaven token. Běžná aktualizace aplikace proto nevyžaduje ruční změnu karty ve Studiu.

## Co se záměrně ještě nedělá

- školní účty a role,
- centrální databáze,
- sdílená knihovna s oprávněními,
- společný školní API klíč,
- synchronizace mezi PC a telefonem,
- centrální žákovské výsledky,
- napojení na Bakaláře.

Tyto funkce by bez backendu nebyly profesionálně bezpečné. Současná verze však připravuje datové formáty a uživatelské postupy tak, aby pozdější přechod na server nevyžadoval předělání celého prostředí.
