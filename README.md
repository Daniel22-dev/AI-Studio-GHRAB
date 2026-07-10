# AI Studio GHRAB

**Verze 0.2.0 — serverless školní portál s automatickou synchronizací aplikací.**

AI Studio GHRAB je samostatný centrální rozcestník. Jednotlivé aplikace zůstávají ve vlastních repozitářích a dál se vyvíjejí nezávisle:

- Generátor interaktivních testů,
- Diferenciátor,
- LUDUS,
- Korespondenční asistent,
- další budoucí aplikace přidané přes jednotný manifest.

Studio neobsahuje kopie aplikací. Při sestavení stáhne jejich veřejné soubory `studio-manifest.json`, ověří verze a vytvoří jednotný registr. Když některý zdroj není dostupný, bezpečně použije poslední známou záložní verzi.

## Co je nové ve 0.2.0

- kompletně nový sci-fi design inspirovaný portálem / hvězdnou bránou,
- animovaný energetický portál, hvězdné pozadí a barevné moduly aplikací,
- samostatné řídicí centrum **Automatizace**,
- automatické načítání verzí z jednotlivých repozitářů,
- hodinová kontrola pomocí GitHub Actions,
- volitelná okamžitá aktualizace přes `repository_dispatch`,
- jednotné manifesty `ai-studio-app-manifest-v1`,
- podpora libovolného počtu budoucích aplikací,
- zachované Centrum bezpečnosti, demo, knihovna a plán pilotu,
- PWA a offline jádro portálu.

## Nasazení

Přesný postup je v dokumentu [`NAHRANI-NA-GITHUB.md`](NAHRANI-NA-GITHUB.md).

Základ:

1. vytvoř nebo otevři repozitář `AI-Studio-GHRAB`,
2. nahraj obsah ZIPu do kořene,
3. v `Settings → Pages` nastav `Source: GitHub Actions`,
4. otevři záložku `Actions` a počkej na zelený běh.

## Automatizace

Bez dalšího nastavení se Studio synchronizuje každou hodinu. Pro okamžité přepnutí po každé aktualizaci aplikace nastav společný secret `AI_STUDIO_DISPATCH_TOKEN` ve třech zdrojových repozitářích. Podrobný postup je v [`AUTOMATIZACE-GITHUB.md`](AUTOMATIZACE-GITHUB.md).

## Architektura

```text
Generátor ─────────────── studio-manifest.json ─┐
Diferenciátor ─────────── studio-manifest.json ─┤
LUDUS ─────────────────── studio-manifest.json ─┼─> AI Studio registry ─> GitHub Pages
Korespondenční asistent ─ studio-manifest.json ─┘
```

- `src/config/sources.json` — adresy zdrojových manifestů,
- `scripts/sync-registry.mjs` — stažení, validace a fallback,
- `src/config/apps.generated.json` — výsledný registr,
- `src/config/apps.fallback.json` — bezpečná záloha,
- `src/config/sync-report.json` — stav poslední synchronizace,
- `src/schemas/ai-studio-app-manifest-v1.schema.json` — kontrakt budoucích aplikací.

## Lokální kontrola

```bash
npm run sync:offline
npm test
```

Online synchronizace:

```bash
npm run sync
npm test
```

## Bezpečnostní hranice

Portál nemá databázi, nepřihlašuje uživatele a neukládá obsah materiálů. Neobsahuje společný API klíč. Lokálně eviduje jen počet otevření aplikací z portálu pro pilotní souhrn.

© 2026 Daniel Baláž · Gymnázium, Ostrava-Hrabůvka. Všechna práva vyhrazena.
