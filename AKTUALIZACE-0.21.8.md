# Aktualizace AI Studio GHRAB 0.21.8

Verze 0.21.8 je cílený CI/security hotfix po běhu GitHub Actions verze 0.21.7. Síťová synchronizace v Actions ověřila všech osm veřejných GitHub zdrojů, ale větev `repository` používala po ověření dál starší lokální snapshot místo právě ověřeného manifestu. Bezpečnostní validátor proto oprávněně vyhodnotil `REGISTRY_FALLBACK_UNCONFIRMED`.

Oprava mění repository fallback tak, aby se do `apps.generated.json` použil ověřený manifest ze zdrojového repozitáře a jeho aktuální verze. Lokální Studio ikona aplikace se zachovává. Současně je zpřesněn bezpečnostní validátor: identický generated/fallback registr je přípustný jen při explicitně potvrzeném offline snapshotu nebo při úplné, přesné shodě všech osmi ověřených zdrojů s generovaným registrem.

Tento hotfix nemění role, oprávnění, Materiály, Prezentaci ani uživatelské workflow 0.21.7.
