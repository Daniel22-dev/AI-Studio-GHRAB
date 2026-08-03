# GHRAB AI Core 1.0.0

Vydaný společný klient pro aplikace AI Studia Gymnázia Ostrava-Hrabůvka.

## Release artefakty

- `ghrab-ai-core-1.0.0.js` — neměnný browser Core;
- `ghrab-ai-conformance-1.0.0.js` — společná konformitní sada;
- `ghrab-ai-contract-v1.0.0.md` — závazný veřejný kontrakt;
- `ghrab-ai-core-manifest-1.0.0.json` — verze, build ID a SHA-256.

Tyto soubory se nesmějí upravovat v repozitáři jednotlivé aplikace. Aplikační build musí ověřit hash proti manifestu. App-specifické operace, schémata, prompty, credential hooky a kompatibilní wrappery patří mimo Core.

Korespondenční asistent 5.9.0 je první referenční integrace.
