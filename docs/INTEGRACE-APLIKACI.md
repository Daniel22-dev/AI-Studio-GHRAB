# Integrace samostatných aplikací — AI Studio 0.6.0

## Princip

Aplikace zůstávají samostatně nasaditelné. Studio jim poskytuje tři společné vrstvy:

1. veřejný manifest pro katalog a synchronizaci,
2. anonymní materiál a krátkodobý handoff,
3. kontrolu podepsaného přístupu po školení.

## Povinné pořadí spuštění

Cílová aplikace nesmí načíst vlastní hlavní modul dříve, než proběhne kontrola oprávnění. Použijte bootstrap v `src/integration/`:

```js
import { protectApp } from 'https://daniel22-dev.github.io/AI-Studio-GHRAB/access/app-guard.js';
const allowed = await protectApp('generator', {
  studioUrl: 'https://daniel22-dev.github.io/AI-Studio-GHRAB/'
});
if (allowed) await import('./app.js');
```

Pro každou aplikaci změňte `appId` a cestu k jejímu skutečnému vstupnímu modulu. Bez této změny chrání Studio pouze spuštění z rozcestníku, nikoli přímou URL.

## Společný formát

`ghrab-material-v1` obsahuje metadata, cíle, anonymní zdrojový obsah, strukturované úlohy a stav kvality. Studio kontroluje velikost, povinná pole, délky a počty položek.

## Přímá předávka

Studio vytvoří `ghrab-handoff-v1` s expirací 30 minut a otevře cílovou aplikaci. Současné aplikace pod `https://daniel22-dev.github.io` mohou sdílet místní úložiště. Při rozdílném originu se použije `.ghrab.json` nebo budoucí serverové API.

## Aplikační identifikátory

- `generator`
- `differentiator`
- `ludus`
- `correspondence`

Identifikátor musí být shodný v manifestu, přístupové politice, oprávnění, bootstrapu a handoffu.

## Povinný test

Pro každou aplikaci ověřte přímou URL bez oprávnění, s oprávněním pro jinou aplikaci, se správným učitelským oprávněním, se správcovským oprávněním a s expirovaným nebo zneplatněným oprávněním.
