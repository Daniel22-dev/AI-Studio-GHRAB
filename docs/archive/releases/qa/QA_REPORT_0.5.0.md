# QA report - AI Studio GHRAB v0.5.0

## Výsledek

Automatické kontroly projektu prošly. Build se vytvořil ve složce `dist/`.

## Ověřeno

- platný registr aplikací;
- dostupnost ikon;
- PWA jádro;
- service worker;
- manifest;
- changelog aktuální verze;
- konfigurační model oprávnění;
- bezpečné exporty bez obsahu pracovního prostoru;
- lokální pilotní data;
- jazykový přepínač v mobilním zobrazení;
- jednotné zápatí;
- přítomnost Kontroly Studia.

## Omezení

Skutečné vynucování oprávnění bez serveru není možné. Lokální režim proškolení slouží pouze pro pilotní simulaci a orientaci učitele.

## Doporučení před ostrým školním provozem

- školní přihlášení;
- serverové role a claims;
- kontrola oprávnění také v cílových aplikacích;
- centrální anonymní agregované statistiky;
- bezpečná API brána;
- limity spotřeby;
- pravidelný měsíční report.
