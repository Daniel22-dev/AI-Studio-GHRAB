# AI Studio GHRAB 0.21.33 — zneplatnění starého přístupu

## Výsledek

Verze 0.21.33 nasazuje veřejný podepsaný aktualizační balíček vytvořený v Centru zabezpečení. Po nasazení bude staré učitelské oprávnění kolegyně odmítnuto; její novější oprávnění správce zástupce zůstává platné.

## Co bylo ověřeno

- veřejný balíček prošel 23 z 23 kontrol podpisu, návaznosti, politiky, klíčů a revokací;
- balíček neobsahuje soukromý klíč ani soukromou složku `d`;
- nový access bundle má platný podpis ES256 a verzi `access-p1-20260824175535Z-k_wtm7Zj`;
- seznam obsahuje právě jedno cílené JTI starého učitelského oprávnění;
- `revokedBefore` zůstává prázdné, takže nedochází k hromadnému zneplatnění;
- bezpečnostní politika, veřejný klíč uživatelských oprávnění a konfigurační ověřovací klíč zůstávají beze změny;
- oba aktivní deployment profily vyžadují přesně novou verzi podepsaného bundle.

## Praktický dopad

Revokace začne skutečně platit až po nasazení verze 0.21.33 na GitHub Pages a po online načtení nové konfigurace zařízením. Již otevřené karty je vhodné zavřít a Studio znovu otevřít. Offline zařízení smí poslední ověřenou konfiguraci používat nejvýše 24 hodin.

## Klíče

Pro nasazení této verze už není potřeba znovu vkládat žádný soukromý klíč. Používá se pouze veřejný balíček, který byl před začleněním kryptograficky ověřen.
