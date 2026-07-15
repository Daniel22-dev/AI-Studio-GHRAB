# Komentář změn — AI Studio GHRAB 0.6.1

## Důvod aktualizace

Verze 0.6.0 zavedla podepsaná bezserverová oprávnění uvnitř Studia. Verze 0.6.1 dokončuje jejich nasazení do všech čtyř samostatných aplikací a opravuje regresi zamykací obrazovky při použití relativní adresy Studia.

## Provedené změny

- Opraveno převádění `/AI-Studio-GHRAB/` na úplnou URL pomocí aktuální adresy stránky.
- Aktualizován centrální registr na Generátor 7.0.6, Diferenciátor 1.0.3, LUDUS 1.14.3 a Korespondenčního asistenta 4.0.3.
- Dokumentace nyní odpovídá dokončené integraci, nikoli pouze připraveným šablonám.
- Bezpečnostní dokumentace výslovně popisuje stav přímých adres a hranice statického serverless řešení.
- Doplněn regresní test relativní adresy zamykací obrazovky.
- Service worker používá novou cache verze 0.6.1.

## Výsledek

Jediný přístup aktivovaný ve Studiu se používá ve všech aplikacích pod stejným originem. Studio neobsahuje soukromý podpisový klíč a nadále ověřuje pouze veřejným klíčem.
