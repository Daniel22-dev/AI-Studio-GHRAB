# Aktualizace AI Studio GHRAB 0.21.9

Verze 0.21.9 je cílený CI hotfix po běhu GitHub Actions verze 0.21.8. Živá synchronizace už správně ověřila všech osm zdrojových repozitářů a ostatní QA brány prošly, ale `npm test` zastavila kontrola `qa:doc-versions`, protože `apps.generated.json` obsahoval aktuální verze aplikací a šest dokumentů stále popisovalo verze z balíčkového snapshotu.

Oprava nesnižuje přísnost kontroly. `npm run sync` nyní po synchronizaci registru a AI readiness automaticky spustí `scripts/sync-doc-app-versions.mjs`, takže dokumentace je ve stejném běhu deterministicky srovnána s právě ověřeným registrem. Totéž platí pro `sync:offline`. Přidána je regresní pojistka, že oba synchronizační příkazy musí dokumentační synchronizaci obsahovat.

Tento hotfix nemění role, oprávnění, Materiály, Bezpečnost, Prezentaci ani showcase video.
