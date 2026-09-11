# AI Studio GHRAB 0.21.30 — oprava následného bezpečnostního ověření

- Z11 potvrzen: verze 0.21.29 zaměnila stáří podepsané konfigurace za dobu od posledního online spojení. Nově se oba údaje měří samostatně: 24 hodin od spojení a 30 dní od podpisu.
- Bezpečnost proti jednoduchému rollbacku zachovává povinná shoda podepsané `bundle.version` se zapečeným `sharedAccessVersion`.
- Z12 potvrzen: přibyl behaviorální test reálného chování školního profilu bez spoléhání na přítomnost řetězců ve zdroji.
- Z13 potvrzen v principu: samostatná kontrola používá skutečný čas. V běžném buildu varuje, v CI a release workflow je blokující.
- Podpisový nástroj před zápisem ověří, že zadaný soukromý klíč odpovídá veřejnému trust anchoru runtime, a odmítne opakované použití stejné `bundle.version`.
- Podepsaný bundle z 4. 8. 2026 je k 21. 8. 2026 starý přibližně 17 dní, takže nový 30denní limit splňuje. Pro publikaci aktuální zdrojové politiky se přesto doporučuje vytvořit nový podpis.
