# AI Studio GHRAB 0.21.3

Hotfix regresní chyby zachycené GitHub Actions: domovská stránka zobrazovala jen Top 4, protože sekce „Další aplikace“ se stále pokoušela vložit před již odstraněný `mission-strip`.

Verze 0.21.3 používá stabilní kotvu `.value-section` s fallbackem do `<main>`, takže se opět vykreslí všech osm aplikací a offline browser kontrakt může splnit požadavek 8/8 karet. Přidána je i regresní kontrola proti návratu této chyby.
