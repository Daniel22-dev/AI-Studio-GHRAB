# AI Studio GHRAB 0.21.43 – CI performance-budget hotfix

- Platforma zůstává **GHRAB Platform 1.1.2**; release-wave lock a 9/9 source verification se nemění.
- `src/config/release-wave.json` je build/CI metadata a nově se po použití nepublikuje do `dist`.
- Performance budget **2 250 000 B se nezvyšuje**. Oprava odstraňuje z runtime artefaktu nepoužívaných 991 B místo oslabení gate.
- E-01 zůstává do společného post-deploy ověření celé vlny otevřený; používat pouze syntetická data.
