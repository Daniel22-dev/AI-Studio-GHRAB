# AI Studio GHRAB 0.21.72 – Performance Pack fáze C

## Rozsah

Fáze C optimalizuje build, PWA instalační cache, statické assety a hygienu zdrojového balíku. Nenarušuje runtime optimalizace z fází A/B, access-control, GARP security, GHRAB Platform 1.1.2 ani AI Core kontrakty.

## Změny

- Instalační PWA cache je nově explicitně rozdělena na **kritické jádro** a **offline-essential** vrstvu. Ostatní stejnooriginový statický obsah se nadále cacheuje existující cestou `cacheFirst()` až při skutečném použití.
- Kritické statické importy (`registry-client`, `motion-policy`, `pilot-event`, `platform-consumers` a portal-card hotfix) jsou výslovně povinné pro první offline restart.
- Error reporter JS/CSS a nezbytné portálové assety zůstávají v best-effort offline-essential vrstvě.
- Manuály, Library, Workflow, Automation, Demo, Pilot, Safety, Report, Tools, API usage, testovací/integration/schema obsah, changelog a prezentační média už nejsou součástí instalační precache; při použití zůstávají dostupné přes runtime cache.
- Osm PNG ikon aplikací bylo převedeno na lossless WebP. Pixelová shoda proti původním PNG byla ověřena metrikou AE = 0 pro všech osm ikon; jejich souhrnná velikost klesla z 213 821 B na 123 503 B.
- Šest PWA PNG ikon bylo znovu bezeztrátově zakódováno; AE = 0 a úspora 5 390 B.
- Distribuční CSS prochází konzervativní build-time whitespace compactorem mimo quoted strings; zdrojové CSS zůstává čitelné a beze změny významu.
- `dist-school-server/` je označen jako reprodukovatelný build artefakt a je v `.gitignore`. `npm run build:school-server` jej dokáže z čistého zdroje znovu kompletně vytvořit.
- Auditní testy PWA cache nyní ověřují skutečný výsledný `dist/sw.js`, nikoli implementační blacklist ve `build.mjs`.
- Přibyl `test:performance-phase-c`, který uzamyká cache vrstvy, velikost precache, WebP/SVG app ikony, CSS compaction, runtime on-demand cache a reprodukovatelnost school-server buildu.
- `npm test` nyní explicitně vytváří `dist/` před testy postavených artefaktů, takže celý regresní řetězec funguje i z čistého checkoutu bez přiloženého build adresáře.
- Hard precache budget byl **zpřísněn** z 1 800 000 B na **1 250 000 B**. Ostatní stropy nebyly zvýšeny.

## Before / After proti 0.21.71

| Metrika | 0.21.71 Phase B | 0.21.72 Phase C | Rozdíl |
|---|---:|---:|---:|
| nemediální `dist` | 2 399 585 B | 2 302 564 B | −97 021 B |
| critical entry | 499 290 B | 499 018 B | −272 B |
| instalační precache | 1 763 319 B | 1 114 462 B | −648 857 B |
| precache asset count | 127 | 65 | −62 |
| app icons | 213 821 B | 123 503 B | −90 318 B |

## Důležitá migrační poznámka k `dist-school-server/`

Pokud je `dist-school-server/` v existujícím GitHub repozitáři už historicky trackovaný, samotné přidání do `.gitignore` ho z Git historie/aktuálního tree neodstraní. Při nasazení 0.21.72 musí být tento adresář jednorázově odstraněn v témže release commitu (např. přes Git/GitHub Desktop/connector). Obyčejný webový upload souborů, které adresář pouze vynechají, staré trackované soubory nesmaže.

Po odstranění se školní distribuční balík kdykoli vytvoří příkazem:

```bash
npm run build:school-server
```

## Neměněno

- Vizuální identita Studia a FULL/LITE/OFF/AUTO.
- Runtime rendering optimalizace z Phase B.
- Access-control, revokace, podepsaný access bundle, CSP a GARP security.
- GHRAB Platform 1.1.2 a AI Core kontrakty.
- 56MB prezentační video zůstává publikovatelným lazy médiem a není součástí instalační precache.
- `distBytes`, `entryCriticalBytes` ani ostatní performance limity nebyly zvýšeny.
