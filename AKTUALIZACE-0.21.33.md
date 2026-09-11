# AI Studio GHRAB 0.21.33

## Co tato aktualizace řeší

Starý učitelský přístup kolegyně už nebude po nasazení použitelný. Nový přístup správce zástupce zůstává zachovaný, protože každý přístupový soubor má vlastní jedinečné JTI a zneplatňuje se pouze konkrétní staré JTI.

| Oblast | Stav ve verzi 0.21.33 |
| --- | --- |
| Staré učitelské oprávnění | cíleně zneplatněno |
| Nové oprávnění správce zástupce | zůstává platné |
| Soukromý konfigurační klíč | není ve zdrojáku ani buildu |
| Klíč pro vydávání oprávnění | beze změny |
| Bezpečnostní politika | beze změny |
| `revokedBefore` | prázdné, bez hromadné revokace |
| Nový podepsaný bundle | platný 30 dní od 24. 8. 2026 |

## Nasazení

Nahraje se celý obsah vydání 0.21.33 do repozitáře AI Studia. Po zeleném GitHub Actions buildu zavřete staré otevřené karty Studia a stránku znovu otevřete online. V Evidenci přístupů se má starý záznam zobrazit jako centrálně zneplatněný.

## Co už není potřeba dělat

Soukromý klíč znovu nevkládejte a veřejný aktualizační JSON znovu nepodepisujte. Jeho obsah i podpis už byly ověřeny a začleněny do této verze.
