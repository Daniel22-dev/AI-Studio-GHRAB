# AI Studio GHRAB

**Verze 0.5.1 — zpevněná serverless pilotní platforma s automatickou diagnostikou a přípravou na školní server.**

AI Studio GHRAB je centrální brána školních digitálních a AI nástrojů. Jednotlivé aplikace zůstávají ve vlastních repozitářích a vyvíjejí se nezávisle. Studio nad nimi vytváří společnou navigaci, správu verzí, bezpečnostní rámec, výměnný formát materiálů, pilotní měření a prezentační vrstvu.

## Co verze 0.5.1 přináší

- čtyři prioritní aplikace kolem centrálního jádra a model uživatelských **Top 4** pro budoucí růst,
- automaticky synchronizovaný registr aplikací s ověřeným fallbackem,
- pilotní označení aplikací chráněné automatickým testem,
- lokální demonstrační režim proškolení; skutečné oprávnění je připraveno pro budoucí backend,
- Pracovní tok s formátem `ghrab-material-v1`, automatickým konceptem a obnovou rozpracované práce,
- bezpečné zápisy do místního úložiště s hlášením zaplnění nebo zablokování,
- krátkodobou předávku `ghrab-handoff-v1` a ruční zálohu `.ghrab.json`,
- knihovnu, Centrum bezpečnosti, changelog a stránku Kontrola Studia,
- anonymní pilotní exporty bez promptů, obsahu, názvů materiálů a volných poznámek,
- oddělení učitelem vykázané úspory času od automatického orientačního odhadu,
- režimy animací: automatický, plný, úsporný a vypnutý,
- PWA a offline jádro.

## Důležitá hranice serverless verze

Studio nemá školní účty, centrální databázi ani společný API klíč. Materiály, koncepty, handoff a pilotní záznamy zůstávají v konkrétním profilu prohlížeče. Lokální zámek proškolení je pouze věrná demonstrace budoucího modelu; nelze jej považovat za bezpečnostní oprávnění.

Přímá předávka přes `localStorage` funguje jen mezi aplikacemi na stejném webovém originu. Při přesunu Studia na školní subdoménu se předávka nahradí serverovým API; do té doby zůstává spolehlivou mezioriginovou cestou export a import `.ghrab.json`.

## Pilotní statistiky bez serveru

Každý proškolený kolega může v části **Pilot** stáhnout anonymní JSON nebo CSV a předat jej správci projektu. Export obsahuje pouze provozní události, počty, hodnocení a časové odhady. Neobsahuje jména, prompty, texty materiálů, jejich názvy ani volné poznámky. Správce může soubory ručně sloučit pro průběžný report vedení.

## Nasazení

1. Nejdříve aktualizujte manifesty a integrační adaptéry v repozitářích dílčích aplikací.
2. Poté nahrajte obsah GitHub ZIPu Studia do kořene repozitáře `AI-Studio-GHRAB`.
3. V `Settings → Pages` ponechte `Source: GitHub Actions`.
4. Počkejte na zelený běh workflow a ve Studiu otevřete **Automatizace** a **Kontrola Studia**.

Podrobný postup je v `NAHRANI-NA-GITHUB-v0.5.1.md`.

## Lokální kontrola

```bash
npm run sync:offline
npm test
```

## Dokumentace

- `ARCHITEKTURA.md`
- `BEZPECNOST.md`
- `AUTOMATIZACE-GITHUB.md`
- `ROADMAP-SERVER.md`
- `RELEASE-CHECKLIST.md`
- `KOMENTAR-ZMEN-0.5.1.md`
- `QA_REPORT_0.5.1.md`
- `REAKCE-NA-AUDIT-CLAUDE-FABLE-5.md`

Autor a vývojový garant: Daniel Baláž  
Školní projekt Gymnázia, Ostrava-Hrabůvka
