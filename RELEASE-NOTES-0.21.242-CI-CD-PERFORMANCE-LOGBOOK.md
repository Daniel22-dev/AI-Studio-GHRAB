# AI Studio GHRAB 0.21.242 — CI/CD performance a logbook
Datum: 2026-10-16

Vydání dokumentuje změny zavedené 15.–16. října 2026, které nebyly zahrnuty v logbooku verze 0.21.241:

- P0: měření latencí release identity.
- P1: omezená souběžnost maximálně tří nezávislých ověřování.
- P2A: odstraněno nadbytečné reportérové sestavení.
- P2B: kontrola shody vstupů a výstupů sestavení.
- P2C: znovupoužití sestavení pouze při přísném SHA-256 a browser důkazu.
- Dodatečné nezávislé ověření tří veřejných souborů po nasazení a retence původních důkazů reportéru.

Nová ochrana verze v P5 kontroluje dopady na runtime, skripty, CI a workflow; vyžaduje zvýšení verze a nový záznam `src/config/changelog.json`. Produkční proces ověřuje shodu aktuálního záznamu s vydávanou verzí. GARP, P5 a Safe Promotion nejsou oslabeny.

Úspěšný deployment neznamená doložené statistické zrychlení celého CI/CD. Pro takový závěr je nutno porovnat více běhů před a po nasazení.
