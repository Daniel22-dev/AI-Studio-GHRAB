# AI Studio GHRAB 0.21.0

Datum: 2026-08-10

## Změna konceptu

- Horní navigace je jediný primární rozcestník. Přibyl veřejný **Katalog změn**.
- Z běžné navigace a domovské stránky byly staženy **Tvorba materiálů** a **Materiály**. Implementace workflow/library zůstává v kódu jako budoucí interoperabilní vrstva, ale aktuální pilot ji neprezentuje jako hotovou univerzální funkci.
- Odstraněn samostatný blok Korespondenčního asistenta, duplicitní domovský správcovský blok a patičkové navigační odkazy.

## Role a reporting

- **Učitel**: vidí měsíční anonymní souhrn v Můj přístup a návod k odevzdání.
- **Správce**: vidí Správu, Prezentaci, Pilotní dashboard, interní testy a nástroje přístupu; učitelský panel pro odesílání souhrnu je mu záměrně skryt.
- Ve Správě zůstal jeden vstup do reportingu: **Pilotní dashboard**. Z něj vede **Souhrnný report kolegů**, kde se importují anonymní JSON soubory.
- Odstraněny duplicitní karty Anonymní report, Prezentační režim a Historie změn.

## Bezpečnost a manuály

- Rychlé posouzení bylo přejmenováno a vysvětleno jako lokální rozhodovací pomůcka, která nečte obsah dokumentu.
- Z Bezpečnosti byly odstraněny bloky označení kvality a verzování materiálů, které patřily do původního centrálního workflow.
- Společný manuál je opraven na osm aplikací a rozlišuje současný bezserverový pilot od plánovaného školního serveru.
- Manuál popisuje plovoucí ovladač **Soukromí a ukončení práce** na sdíleném zařízení.

## Vzhled

- Patička zůstává informační (autor, škola, verze), ale má modrý povrch Studia a žádné redundantní odkazy.
