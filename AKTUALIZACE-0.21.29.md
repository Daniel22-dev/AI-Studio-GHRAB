# AI Studio GHRAB 0.21.29

## Bezpečnostní hardening

- Access bundle a jeho podpis obcházejí service worker; cache už nemůže předstírat online revokační kontrolu.
- Offline stáří vychází z podepsaného času vydání bundle, nikoli z upravitelného času v localStorage.
- GitHub Pages i school-server build mají deployment profil zapečený při buildu. Neznámý profil nepovolí osobní API klíč ani přímý AI transport.
- Všech osm zbývajících `innerHTML` bylo nahrazeno bezpečným DOM API; XSS baseline je nyní nula.
- Všechny GitHub Actions jsou připnuté na plné commit SHA a měsíčně kontrolované Dependabotem.
- Nová oprávnění vydaná od 22. 8. 2026 mají tvrdý limit 90 dní. Již vydaná oprávnění se kvůli bezpečné migraci nezneplatňují zpětně.

## Důležitý krok správce

Aktuální podepsaný access bundle byl vydán 4. 8. 2026. Po této opravě je proto pro offline režim starší než povolených 24 hodin. Správce má na svém počítači spustit `npm run access:sign` se soukromým konfiguračním podpisovým klíčem a nový bundle nasadit. Soukromý klíč se nikam neposílá ani nevkládá do repozitáře.
