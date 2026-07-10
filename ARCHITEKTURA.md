# Architektura AI Studio GHRAB 0.5.1

## Základní princip

Studio je federovaný portál. Generátor, Diferenciátor, LUDUS a Korespondenční asistent zůstávají v samostatných repozitářích. Každá aplikace zveřejňuje `studio-manifest.json`; Studio jej načte, zkontroluje a sestaví registr. Pokud živý zdroj selže nebo deklaruje nepovolený stav, použije ověřený fallback.

```text
zdrojové aplikace ── manifesty ──► AI Studio GHRAB
                                      ├─ Top 4 kolem jádra
                                      ├─ katalog ostatních aplikací
                                      ├─ pracovní tok a knihovna
                                      ├─ bezpečnost a diagnostika
                                      └─ pilotní report
```

## Top 4 a růst portálu

Dokud jsou aplikace čtyři, zůstávají všechny kolem centrálního jádra. Při růstu portálu se kolem jádra zobrazí nejvýše čtyři uživatelské priority. Uživatel si je připne z katalogu; ostatní aplikace zůstanou dostupné v přehledném seznamu s filtrem, stavem proškolení a verzí. Na telefonu se používá svislý seznam „Moje aplikace“.

## Výměnný formát a předávka

- `ghrab-material-v1` — přenositelný výukový materiál,
- `ghrab-handoff-v1` — krátkodobá předávka s expirací 30 minut,
- `ludus-content-v2` — herní obsah pro LUDUS.

Předávka v serverless režimu používá `localStorage`, a proto vyžaduje stejný origin. Handoff nyní přenáší také návratovou adresu Studia. Adaptéry ji použijí s bezpečným fallbackem na repozitář `AI-Studio-GHRAB`.

`sessionStorage` se pro přímou předávku nepoužívá: při otevření cílové aplikace do nové karty s `noopener` by nová karta neměla spolehlivě sdílený stav. Pro přechod mezi různými originy slouží `.ghrab.json`; v serverové etapě předávku převezme API.

## Místní datové vrstvy

- `ghrab.workspace.v1` — maximálně 20 materiálů,
- `ghrab.workflow.draft.v1` — automaticky ukládaný koncept,
- `ghrab.handoff.v1` — jedna krátkodobá předávka,
- `ghrab.pilot.launches` — počty spuštění,
- `ghrab.pilot.events.v2` — provozní události bez obsahu,
- `ghrab.report.cases.v1` — anonymní případové studie.

Všechny zápisy procházejí bezpečným helperem. Při zaplnění kvóty nebo zablokovaném úložišti se operace ukončí kontrolovaně a uživatel dostane srozumitelnou zprávu.

## Připravenost na backend

Datová rozhraní jsou oddělena od úložiště. Budoucí backend nahradí lokální úložiště, lokální zámek proškolení a ruční sběr reportů, aniž by se musela měnit základní logika uživatelského rozhraní.

## Provozní kontrakty

- Název repozitáře `AI-Studio-GHRAB` zůstává závazným fallbackem pro GitHub Pages.
- Zdrojové manifesty nesmějí před formálním schválením školy označovat aplikaci jako školní produkční provoz.
- Bridge 1.1 vyžaduje Studio 0.5.1 a zachovává kompatibilitu s formáty verze 1.0.
