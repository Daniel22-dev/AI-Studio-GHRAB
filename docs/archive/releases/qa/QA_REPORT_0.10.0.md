# QA report - AI Studio GHRAB 0.10.0

## Výsledek

**PASS - automatická kontrola AI Studia, build a mezi-repozitářový release audit proběhly bez chyby.**

## Ověřeno

- verze a registry všech pěti aplikací,
- podepsané přístupy a správcovské stránky,
- oddělení živých a testovacích dat správce,
- aktivní čas jen při viditelné kartě, zaměřeném okně a nedávné interakci,
- pěti minutový limit nečinnosti a ochrana před dvojím měřením více karet,
- pevně povolené typy výstupů všech aplikací,
- anonymní export bez promptů, textů, jmen a volných poznámek,
- měsíční souhrn a import bez dvojího započtení stejného zařízení,
- připomenutí během posledních sedmi kalendářních dnů měsíce,
- ruční potvrzení odeslání reportu,
- samostatný interaktivní manuál,
- barevné a černobílé jednostránkové PDF A4,
- přesné logo školy, aktuální brána AI Studia, tabulka aplikací a autorství,
- čitelnost PDF po renderování při 200 DPI,
- PWA cache a produkční sestavení `dist/`.

## Výstup testu

```text
AI Studio GHRAB 0.10.0 built to dist/
Všechny kontroly AI Studio GHRAB prošly.
Release audit: vše zelené.
```
