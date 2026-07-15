# AI Studio GHRAB v0.16.7 — oprava formátování synchronizovaného registru

## Co ukázal GitHub Actions

Instalace závislostí i synchronizace manifestů už proběhly správně. Build selhal až v kroku `Validate and build`, protože online synchronizace přepsala soubor `src/config/apps.generated.json` a výsledný JSON neměl přesně stejné zalomení řádků, jaké očekával Prettier.

Nešlo o chybu aplikace ani manifestů. Šlo o nesoulad mezi:

1. generováním JSON pomocí `JSON.stringify`,
2. následnou kontrolou formátu pomocí Prettieru.

## Provedená oprava

- přidán skript `format:generated`,
- online synchronizace nyní po stažení manifestů automaticky spustí Prettier,
- totéž platí pro offline synchronizaci,
- formátují se pouze dva generované soubory:
  - `src/config/apps.generated.json`,
  - `src/config/sync-report.json`.

Díky tomu jsou soubory před validačním krokem vždy ve formátu, který kontrola sama vyžaduje.

## Co se nemění

- elegantní filmová launch sekvence,
- instalační nabídka PWA,
- přístupový systém,
- evidence, správa, reporty a ostatní funkce,
- obsah vzdálených manifestů.

## Očekávaný výsledek na GitHubu

Kroky by nyní měly projít v pořadí:

1. Install dependencies,
2. Synchronise application manifests,
3. automatické formátování generovaných JSON souborů,
4. Validate and build,
5. upload a deploy GitHub Pages.
