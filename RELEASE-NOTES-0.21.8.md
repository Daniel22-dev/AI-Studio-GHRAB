# AI Studio GHRAB 0.21.8

## CI / security hotfix

- opravena větev `repository` v `scripts/sync-registry.mjs`; ověřený GitHub manifest se nyní skutečně stává zdrojem položky v `apps.generated.json`,
- zachována lokální ikona Studia,
- `qa/project-validator.mjs` nyní vyžaduje přesnou shodu `generated version = report version = sourceVersion`, pokud se identický registr opírá o živé ověření zdrojů,
- přidána regresní kontrola proti návratu zastaralého snapshotu po úspěšném repository verification,
- ostatní funkční změny 0.21.7 zůstávají beze změny.
