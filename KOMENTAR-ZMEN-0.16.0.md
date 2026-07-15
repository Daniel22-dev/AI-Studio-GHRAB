# AI Studio GHRAB 0.16.0 — komentář k úpravám

## Cíl verze
Tato verze rozvíjí tři vizuální a prezentační prvky, ale záměrně je nešíří do částí, kde by zpomalovaly práci. Výraznější efekty jsou pouze na domovské bráně a na stránce Prezentace.

## 1. Výraznější „wow efekt“ při spuštění aplikace
Po kliknutí na povolenou aplikaci se spustí celoplošná filmová sekvence:

1. zaměření cílové aplikace,
2. uzamčení mechanických prstenců,
3. otevření horizontu událostí,
4. přechod do aplikace.

Sekvence používá barvu konkrétní aplikace, její ikonu a název. Uživatel ji může přeskočit. Plný režim trvá přibližně 3,8 sekundy; úsporný a vypnutý režim mají výrazně kratší variantu.

## 2. Holografické plovoucí panely
Na domovské scéně pro větší počítačovou obrazovku byly doplněny lehké holografické panely. Odkazují na:

- přehled ekosystému,
- stav přístupu,
- místní materiály,
- bezpečnost,
- manuály,
- správcovský režim projekce.

Nejde o těžké 3D modely. Panely jsou postavené v CSS, takže nezavádějí externí knihovnu ani další serverovou závislost. Na menších obrazovkách se automaticky skryjí.

## 3. Režim projekce
Stávající stránka Prezentace byla doplněna o skutečný režim pro projektor nebo velký displej:

- celé plátno bez horní navigace a dalších rušivých prvků,
- výrazně větší typografie a obsah,
- horní přehled kroku a průběhu,
- ovládání šipkami, mezerníkem, Page Up / Page Down, Home a End,
- spodní ovládací panel,
- možnost automatického přehrávání.

Klávesa `P` režim projekce zapíná nebo vypíná.

## 4. Poznámky řečníka mimo projektor
Tlačítko „Poznámky v novém okně“ otevře samostatné okno určené pro monitor prezentujícího. Okno automaticky zobrazuje:

- aktuální krok,
- obsah viditelný na plátně,
- doporučený ústní komentář,
- následující krok,
- vlastní tlačítka Předchozí / Další.

Publikum poznámky na projektoru nevidí. Klávesa `N` okno poznámek otevře.

## Co zůstalo beze změny
- správa přístupů,
- evidence přístupů,
- vydávání přístupů,
- formuláře,
- pracovní tok materiálů,
- knihovna,
- reporty,
- bezpečnostní logika,
- měření pilotu,
- PWA provoz.

Tyto části nedostaly žádné zdržující 3D přechody.

## Technické soubory
Hlavní změny jsou v:

- `src/index.html`,
- `src/app.js`,
- `src/styles.css`,
- `src/demo/index.html`,
- `src/demo/demo.js`,
- `src/config/changelog.json`,
- `scripts/test.mjs`,
- `package.json`.

## Kontrola
Byl spuštěn kompletní příkaz:

```bash
npm test
```

Výsledek: všechny kontroly a sestavení verze 0.16.0 prošly.

## Návrat zpět
Původní balíček 0.14.4 zůstává nedotčeným návratovým bodem. Při nespokojenosti lze obsah původního balíčku znovu nahrát do kořene repozitáře.
