# AI Studio GHRAB 0.13.0 – komentář změn

## Co se změnilo

Původní aktivační sekvence zrychlovala především dekorativní oběžné dráhy, světla a vír. Ve verzi 0.13.0 jsou nad hlavním obrazem brány vytvořeny tři přesně maskované obrazové vrstvy odpovídající skutečným kruhovým pásům brány.

Po kliknutí na aplikaci:

1. vnější konstrukční prstenec se rozbíhá po směru hodinových ručiček,
2. prostřední znakový prstenec se pohybuje opačně,
3. vnitřní oranžový prstenec se znovu pohybuje po směru,
4. všechny prstence během pohybu několikrát zastaví, jako by hledaly správnou polohu,
5. sedm světelných zámků se postupně aktivuje kolem obvodu,
6. prstence dokončí celé otáčky a vrátí se do přesného zarovnání původní grafiky,
7. otevře se zvolená aplikace.

## Důležitá technická vlastnost

Nejde jen o několik otáčejících se čar. Každý prstenec má vlastní kompletní kruhovou grafiku s kovovými segmenty, značkami a světelnými body. Díky tomu se při rotaci nepohybují části podstavce ani boční panely původního obrazu a animace zůstává čistá po celém obvodu.

## Režimy pohybu

- **Plný:** kompletní filmová sekvence 2,85 s.
- **Lehký:** zkrácené otočení 0,9 s bez sekvenčního blikání.
- **Vypnutý:** bez rotace.
- **Omezení pohybu v systému:** bez mechanického pohybu, pouze krátké bezpečné zvýraznění.
