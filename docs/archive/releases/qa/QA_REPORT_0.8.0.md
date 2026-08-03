# QA report — AI Studio GHRAB 0.8.0

## Výsledek

**PASS — automatická kontrola a sestavení proběhly bez chyby.**

## Ověřeno

- syntaktická kontrola JavaScriptu,
- úplnost registru pěti aplikací a lokálních ikon,
- podepsaná oprávnění a správcovské brány,
- interní prohlížeč manuálů,
- bezpečné exporty a PWA precache,
- nový asset `portal-gateway.png` v distribučním buildu i service workeru,
- desktopové rozložení prémiové brány,
- mobilní rozložení 390 px,
- omezení animací v režimech full / lite / off a při `prefers-reduced-motion`.

## Spuštěná kontrola

```bash
npm test
```

Výstup: `Všechny kontroly AI Studio GHRAB prošly.`
