# AI Studio GHRAB 0.21.37 – GARP 2.3 opravné kolo po Claude kontrole

- Opraveno pokrytí datového manifestu a verifikace úplného mazání po nálezech B-01 až B-03.
- Storage migrace povýšena na `p2-storage-namespace-v2` a rozšířena o workflow, reporty a evidenci vydaných oprávnění.
- Odstraněny zamrzlé odkazy na platformu 1.1.0 v release QA a build-info (B-04 až B-08).
- Ošetřen druhý zapisovatel handoffu a přesnější diagnostika kolize (B-09, B-10).
- Regrese rozšířeny o kontrolu povrchu vlastnosti, nikoli jen o konkrétní opravené klíče (B-11).
- Kandidát je určen pro druhou nezávislou kontrolu dle GARP 2.3; do jejího výsledku nejde o finální GREEN release.

- Výkonnostní rozpočty nebyly zvýšeny: build komprimuje pouze strojové JSON artefakty a bezpečně odstraňuje odsazení před HTML tagy, aby `distBytes` i `entryCriticalBytes` zůstaly pod stávajícími limity.

- Historický `deployment.school-server-p0.json` zůstává ve zdrojích pro kompatibilitní testy, ale veřejný build jej už nepublikuje; aktivní GitHub i school-server profil mají `aiTransport: not-applicable` a aplikační kód nemá volajícího `createAiRuntimeConfig()`.
- Aktuální kandidát zůstává do druhé nezávislé kontroly a browserových/účtových důkazů ve stavu AMBER; reálná studentská data nejsou povolena.
