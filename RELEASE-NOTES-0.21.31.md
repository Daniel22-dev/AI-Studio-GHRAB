# AI Studio GHRAB 0.21.31 — rotace konfiguračního ověřovacího klíče

## Výsledek

Verze 0.21.31 bezpečně přebírá veřejný rotační balíček vytvořený 22. 8. 2026. Balíček před začleněním prošel kryptografickou i obsahovou kontrolou 19/19. Podpis ES256 je platný, všechny identifikátory a verze si odpovídají a balíček neobsahuje soukromý klíč.

## Co se změnilo

- konfigurační trust anchor byl nahrazen novým veřejným klíčem `ghrab-access-bundle-20260822195407Z-fxjS8DK9`;
- runtime obsahuje stejný veřejný klíč jako konfigurační soubor;
- podepsaný access bundle a jeho podpis byly nahrazeny verzí `access-p1-20260822195407Z-fxjS8DK9`;
- aktivní deployment profily vyžadují přesně tuto verzi bundle;
- přibyl validátor veřejných rotačních balíčků, který kontroluje absenci soukromého materiálu, podpis, klíče, verze, čas, limity a přesnou shodu s aktuální politikou, revokacemi a veřejným klíčem pro oprávnění.

## Co se nezměnilo

Klíč `ghrab-2026-07-10-6449ca2a`, kterým se ověřují uživatelská a správcovská oprávnění, zůstává beze změny. Již vydaná platná oprávnění proto pokračují do své expirace nebo výslovné revokace. Rotace konfiguračního klíče nevyžaduje nové oprávnění pro každého uživatele.

## Časové limity

Bundle byl vydán `2026-08-22T19:54:07.859Z` a jeho 30denní kryptografická platnost končí `2026-09-21T19:54:07.859Z`. Offline zařízení musí navíc nejméně jednou za 24 hodin úspěšně načíst aktuální podepsanou konfiguraci online. Po překročení kteréhokoli limitu systém selže uzavřeně.

## Soukromý klíč

Soukromý konfigurační podpisový klíč nebyl součástí převzatého balíčku, není v repozitáři ani ve výsledném buildu. Zůstává výhradně u správce. Do AI Studia 0.21.31 se publikuje pouze jeho veřejná část.
