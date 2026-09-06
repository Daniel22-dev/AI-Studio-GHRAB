# AI Studio GHRAB 0.21.42 – Platform 1.1.2 wave-lock hotfix

Tato verze je úzký release-wave hotfix po úspěšném nasazení child aplikací.

- GitHub QA pro 0.21.41 správně zastavil deploy, protože veřejně ověřené SORTIO už bylo ve verzi 1.1.5, zatímco `src/config/release-wave.json` stále zamykal 1.1.4.
- Opravena je pouze očekávaná finální verze SORTIO v centrálním wave locku a související aktuální registry/metadata.
- Fail-closed `qa:ecosystem:verified` se neoslabuje ani neobchází.
- Platforma zůstává 1.1.2 a `requiredPlatformRange` zůstává `>=1.1.2 <2.0.0`.
- E-01 není tímto automaticky uzavřen; po nasazení je stále nutný společný post-deploy ekosystémový test se syntetickými daty.
