# Conversation Lab 0.12.0 – připravená, NEAKTIVNÍ integrace do AI Studia

**23. 10. 2026 · pracovní větev · BEZ nasazení a bez placených GitHub Actions**

## Co tato větev obsahuje

- `src/conversation-lab/teacher-entry-012-proposal.js`: přesná kopie neměnného návrhu ze zdrojového Conversation Lab PR #26 (Git blob `928600b12b7ba1c90f418d4381dc7b7cd12e6479`). Návrh používá stávající nativní `initialiseAccess`, `requiredTraining('conversation-lab')`, `assertClbSignedTrainingPolicy` a `hasAppAccess` v tomto pořadí.
- `scripts/test-clb-012-teacher-proposal.mjs`: samostatná sada 10 negativních a integračních testů, původně ověřená na stejném návrhu, s přizpůsobenou cestou ke zdroji. Spuštění zdarma: `node --test scripts/test-clb-012-teacher-proposal.mjs`.
- Tento protokol.

**Neobsahuje:** žádnou změnu `src/conversation-lab/teacher-entry.js`, `release-profile.js`, `portal-route.js`, `launch-control.v0.11.0.json`, registru aplikací, souborů GIT, obsahu studentů, instalačního balíčku ani deploy workflow. Nic v nové větvi se automaticky neimportuje do běžícího Studia.

## Význam bezpečnostních kontrol

Ani s nativním podepsaným školením CLB-01 a přístupovým oprávněním nedojde k povolení 0.12.0. Modul bez výjimky zamítne spuštění s `CLB_R4C10_TEACHER_OWNER_V3_P5_E9_RELEASE_REQUIRED`, protože pro nové vydání dosud neexistuje prověřený finální **owner ES256 v3**, **nezávislý důvěryhodný P5** a nový přesný **E9 release pin**.

**NESPOJOVAT s kandidátem Studio před skutečným ověřením finálního student/teacher ZIPu a jejich podpisů.** Pouhé nahrazení verze 0.11.0 řetězcem 0.12.0 nebo přepnutí launchEnabled/GO je zakázáno.

## Produkční integrační cesta

1. Conversation Lab zdrojový PR #26 dokončí skutečné nové lekce, public+teacher 0.12.0 přehrávače a **finální dva oddělené distribuční ZIPy** bez soukromých dat.
2. Autor nezávisle prověří kvalitu 32/32 každé varianty, schválí **přesně distribuovaná data** a podepíše vlastnický ES256 v3. P5 nezávisle prověří skutečné finální archivy a poskytne důvěryhodně připnutý veřejný klíč i reporty.
3. Přesně ověřený public ZIP se nahraje na **Cloudflare Preview**, nikoli hned na produkci; ověří se identické SHA/SRI/CSP a starých 576 i nových tras.
4. Studio dostane **samostatný podepsaný 0.12.0 E9 release-profile a launch-control**, zachovávající nativní CLB-01, hasAppAccess a zákaz přenosu Studio tokenů na anonymní studentský web.
5. Spustí se kanonický Studio P5 a safe-promotion candidate→main, potom kontrola LIVE a dokumentovaný návrat k původní 0.11.0, pokud cokoliv selže.

## Evidence skutečného stavu

- Studio `main` i `candidate` k zahájení této větve: `fa0af190fa4e9b0cba255f515c4bed1a7965c6ef`, podepsaná učitelská 0.11.0.
- Source PR #26 k zahájení: `66c60dd08ef34fc70055ab7e2b9463246adac907`, DRAFT / NO_MERGE / NO_DEPLOY.
- Autentické původní dva ZIPy 0.11.0, nové skutečně schválené varianty, finální v3 podpis a nezávislé P5 zatím nebyly v tomto pracovním prostředí dostupné.
- GitHub Actions free budget je vyčerpaný: tato větev nevyvolává placené spuštění, ale je třeba to respektovat také při následném PR.

Související: [go-live issue](https://github.com/Daniel22-dev/conversation-lab-source/issues/27), [source PR](https://github.com/Daniel22-dev/conversation-lab-source/pull/26), [Studio E9](https://github.com/Daniel22-dev/AI-Studio-GHRAB/issues/293).
