# AI Studio GHRAB 0.21.28

## Osobní přehled testování

- Plný správce má v záhlaví každé karty aplikace symbol stavu: `○` netestováno, `◐` lehce otestováno nebo `✓` otestováno.
- Kliknutím se stav cyklicky mění a ukládá se v aktuálním prohlížeči podle stabilního ID aplikace.
- Nové aplikace jsou bez další konfigurace automaticky označeny jako netestované.
- Pomůcka se nezobrazuje běžným učitelům ani v Pohledu kolegy.

## Srozumitelnější přístupový souhrn

- Volba role Správce už automaticky nepřepisuje datum na 14 dní. Hlavní správce má samostatné tlačítko pro aktuální maximum 400 dní; rychlé volby 7/14/30 dní slouží dočasnému plnému zastoupení.
- U správce se datum nově popisuje jako platnost bezpečnostního oprávnění, nikoli jako platnost samotné role správce.
- Nejasné označení „seznam odvolání“ bylo nahrazeno formulací „kontrola zneplatněných přístupů“.
- Podepsaná oprávnění, jejich maximální bezpečnostní limit i revokační mechanismus zůstávají zachovány.
