# E113 — skutečně zjištěná pravidla GitHubu pro vydávání AI Studia

**Datum ověření:** 18. 10. 2026 (přímé čtení GitHub REST API). **Stav:** technický podklad, NE schválení pravidel.

### Hlavní větev AI-Studio-GHRAB
Na `https://api.github.com/repos/Daniel22-dev/AI-Studio-GHRAB/rulesets/23580364` je aktivní ruleset **main** (ID **23580364**) s omezením na `refs/heads/main`.

Zjištěná pravidla:
- zákaz mazání větve a non-fast-forward přepisování historie;
- merge přes pull request;
- vyžadovaná kontrola **`p5-release-gate`**;
- `required_approving_review_count: 0`;
- `require_code_owner_review: false`;
- `require_last_push_approval: false`;
- `bypass_actors: []`.

**Důsledek pro F-05:** Samotná pravidla větve main nyní neprokazují nezávislý lidský souhlas. CI P5 je důležitá technická brána, ale nepodepsané textové pole `independentSecurityApproval: SIGNED_AND_VERIFIED` není kryptografický důkaz ani institucionální akceptace.

Pokus o čtení `/branches/main/protection` a `/branches/candidate/protection` v dostupné integraci skončil HTTP 403; **o úplné ochraně candidate ani main nelze z tohoto pokusu vyvodit další závěr**. Soukromé `conversation-lab-source` rulesets nebyly kvůli oprávněním/tarifu dostupné; **nesmíme tvrdit, že jsou chráněné**.

### Návrh nápravy (jen po rozhodnutí vlastníka repozitáře a školy)
1. Rozhodnout, jaká **jiná než vývojářská** role je oprávněná přijmout zbylá provozní rizika školní služby.
2. Pro citlivé změny vydávání zvážit pravidlo vyžadující schválení další osoby, ideálně skutečnou Code Owner ochranu pro `src/integration/conversation-lab/**`, `src/config/apps*.json`, přístupovou politiku a související workflow. Neuvádět fiktivní GitHub účet.
3. Nebo/zejména vydat **samostatný autentizovaný nebo ES256 podepsaný** záznam akceptace, s jiným klíčem/identitou než vlastník obsahu. Připnout přesný SHA-256 verze a důkazy v produkční vydávací bráně.
4. Než je kterákoli varianta zavedená a otestovaná, nepovažovat nepodepsané pole v `launch-control.json` za náhradu schválení.
5. Potvrdit provedení opatření a skutečné ochrany opětovným čtením nastavení nebo jiným ověřitelným důkazem (screenshot/JSON nastavení od vlastníka účtu).

Všechny výše uvedené kroky **zatím mají stav NEPROVEDENO**; tento soubor pouze dokumentuje podklady, aby nedošlo k přeceňování stávající ochrany.
