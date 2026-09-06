# AI Studio GHRAB 0.21.41 – Platform 1.1.2 wave gate

Release-wave kandidát doplňuje fail-closed ekosystémovou kontrolu nad již zavedeným `ghrab-suite-session-v1`.

- očekávané verze všech devíti child aplikací jsou uzamčeny v `src/config/release-wave.json`;
- každá child aplikace musí deklarovat Platformu 1.1.2 a `>=1.1.2 <2.0.0`;
- GitHub deploy AI Studia musí po synchronizaci ověřit 9/9 skutečných zdrojů; fallback snapshot je pro deploy blokující;
- centrální registry a AI readiness se regenerují z aktuálního wave snapshotu;
- Maturita Desk 1.0.3 nově publikuje vlastní Studio manifest;
- E-01 se tímto releasem automaticky neuzavírá; před společným browserovým ověřením celé wave zůstává stav kandidátní a používají se pouze syntetická data.
