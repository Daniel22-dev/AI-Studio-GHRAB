# Studio Bridge v1

Studio Bridge je lokální integrační vrstva pro aplikace provozované pod stejným původem GitHub Pages.

## Co dělá

- čte krátkodobou předávku `ghrab-handoff-v1`,
- ověří základní tvar `ghrab-material-v1`,
- kontroluje cílovou aplikaci a expiraci,
- po převzetí předávku odstraní,
- umí uložit materiál do místního pracovního prostoru,
- nic neposílá na server.

## Aktuální adaptéry

- `generator` — Generátor 7.0.5,
- `differentiator` — Diferenciátor 1.0.2,
- `ludus` — LUDUS 1.14.2,
- `correspondence` — Korespondenční asistent 4.0.2.

Každá aplikace má vlastní mapování polí, protože jejich formuláře a pedagogický účel se liší.

## Životní cyklus

1. Studio validuje materiál.
2. Zapíše handoff s cílem a expirací 30 minut.
3. Stáhne záložní `.ghrab.json`.
4. Otevře cílovou aplikaci s `?studioHandoff=1`.
5. Aplikace handoff převezme a okamžitě smaže.
6. Zobrazí banner o importu a odkaz zpět.

## Klíče

- `ghrab.handoff.v1` — jedna krátkodobá předávka,
- `ghrab.workspace.v1` — maximálně 20 místních materiálů,
- `ghrab.pilot.events.v2` — anonymní události použití.

## Bezpečnost

Předávka není šifrovaná. Je určena pouze pro anonymní, veřejný nebo didaktický obsah bez identifikačních údajů. Na sdíleném počítači je nutné místní data po práci odstranit.

## Omezení stejného původu

Přímá lokální předávka funguje, dokud jsou aplikace pod stejným schématem, hostitelem a portem. V současnosti jde o `https://daniel22-dev.github.io`. Při budoucím rozdělení na více domén se použije serverové API nebo souborový import.
