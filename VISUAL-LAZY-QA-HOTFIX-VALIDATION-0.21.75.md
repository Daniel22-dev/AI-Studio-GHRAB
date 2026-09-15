# AI Studio GHRAB 0.21.75 — Visual lazy-image QA hotfix validation

Datum: 2026-09-15

## Vstupní GitHub důkaz (0.21.74)

- `sync`: registr 9 aplikací, ověřeno 9/9.
- `qa:ecosystem:verified`: PASS, Platform 1.1.2, 0 auto-patch promotion.
- Platform conformance: 207/207 PASS.
- Technical: PASS.
- PWA: PASS.
- Combinatorial: PASS (9/36, pairwise 100 %).
- Critical: PASS (6 workflow).
- Release gate skončil NOT_READY pouze kvůli Visual QA:
  - 360×800: 5 „nenačtených“ obrázků,
  - 412×915: 5,
  - 768×1024: 3.
- U všech tří nálezů byly `badResponses: []`, `consoleErrors: []` a `pageErrors: []`.
- Hlášené soubory odpovídaly extra kartám z Performance Phase B s `loading="lazy"`.

## Kořenová příčina

Původní `qa-visual.mjs` považoval každý obrázek s `src` a `complete === false` po timeoutu za rozbitý. To je nesprávné pro off-screen `loading="lazy"` obrázky: prohlížeč je smí záměrně vůbec nenačíst, dokud se nepřiblíží viewportu.

Statická regresní sada přitom samostatně kontroluje, že `app.icon` každé aplikace fyzicky existuje ve zdrojích. Nález proto nebyl chybějící asset ani HTTP 404, ale konflikt staré Visual QA logiky s novou Phase B optimalizací.

## Oprava

`qa-visual.mjs` nyní:

1. čeká na eager obrázky a na lazy obrázky, které jsou právě relevantní pro viewport;
2. ignoruje pouze nedokončené lazy obrázky mimo viewport;
3. stále označí jako chybu:
   - dokončený obrázek s `naturalWidth === 0`,
   - nedokončený eager obrázek,
   - nedokončený lazy obrázek, který je právě ve viewportu.

Produkční `loading="lazy"`, `content-visibility`, release-wave, promotion policy, GARP i Platform 1.1.2 se nemění.

## Regresní ochrana

`test-performance-phase-b.mjs` nově kontroluje, že Visual QA zachovává viewport-aware lazy-image guard jak ve wait fázi, tak v broken-image klasifikaci.

## Lokální validace 0.21.75

- `npm test`: EXIT 0.
- Platform conformance: 207/207 PASS.
- P3 quality: 194/194 PASS, 0 warnings.
- Audit regressions: 57/57 PASS.
- Security regressions: 16/16 PASS.
- GARP security regressions: 19/19 PASS.
- Performance A: PASS.
- Performance B: PASS včetně nové lazy Visual QA regrese.
- Performance C: PASS (precache 1,115,747 B / 1,250,000 B).
- Performance D: PASS.
- `build:school-server`: EXIT 0.
- PWA gate: PASS.
- Combinatorial gate: PASS.
- Security gate: WARN pouze preexistující MINOR `LOCAL_STORAGE_NO_EVIDENCE` ve statické analýze testovacího skriptu; nejde o release blocker ani o nový nález hotfixu.

### Performance budget po hotfixu

- non-media dist: 2,305,679 B / 2,400,000 B,
- critical entry: 359,637 B / 420,000 B,
- precache: 1,115,747 B / 1,250,000 B,
- largest file: 140,614 B / 200,000 B.

## Integrita release governance

SHA-256 `src/config/release-wave.json` je proti 0.21.74 beze změny:
`66fd212f8b6324a6001e6635c85737327fbd6181babd7faa6b3e57bfa8c3500c`

SHA-256 `src/config/release-promotion-policy.json` je proti 0.21.74 beze změny:
`80c889baa9d89735a466396e2e0325f93393117a70ed7aef7fb64d01eb503a41`

GitHub Actions zůstává finální autoritou pro plný Node Playwright Visual gate v runneru. Hotfix míří přesně na tři Visual QA nálezy z běhu 0.21.74 a neoslabuje detekci skutečně rozbitých/viditelných obrázků.
