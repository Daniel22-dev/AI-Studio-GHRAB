# AI Studio GHRAB 0.21.31

## Praktický význam aktualizace

Toto vydání dokončuje jednorázovou rotaci klíče, kterým AI Studio ověřuje pravost své bezpečnostní konfigurace. Nejde o klíč používaný k udělování oprávnění učitelům a správcům.

| Oblast | Stav po aktualizaci |
| --- | --- |
| Konfigurační ověřovací klíč | nový veřejný klíč |
| Podepsaný access bundle | nový, vydaný 22. 8. 2026 |
| Klíč uživatelských oprávnění | beze změny |
| Stará platná oprávnění | nadále fungují |
| Soukromý konfigurační klíč | zůstává pouze u správce |
| Nový soukromý materiál v aplikaci | žádný |

## Nasazení

Nasazuje se celý build 0.21.31. Konfigurační soubory nelze bezpečně míchat se starší verzí aplikace, protože runtime, podpis, trust anchor a `sharedAccessVersion` musí tvořit jeden celek.

Po nasazení je nutné alespoň jednou otevřít AI Studio online. Zařízení tím získá nový ověřený last-known-good bundle. Poté může pracovat offline nejvýše 24 hodin; samotný podepsaný bundle má maximální stáří 30 dní.

## Další etapa

Měsíční obnova podepsané konfigurace bude převedena do jednotného správcovského rozhraní pro celý ekosystém. Verze 0.21.31 připravuje a ověřuje bezpečné datové formáty, ale ještě nezavádí toto budoucí uživatelské rozhraní.
