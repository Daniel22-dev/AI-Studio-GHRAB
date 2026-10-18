# Conversation Lab GHRAB 0.9.2 — návrh záznamu akceptace rizik

**VZOR K VYPLNĚNÍ A SCHVÁLENÍ. NEJDE O JIŽ UDĚLENÝ SOUHLAS.**

## Identifikace rozhodnutí
- **Škola / oprávněná instituce:** [DOPLNÍ SE]
- **Schvalující osoba a funkce:** [DOPLNÍ SE]
- **Oprávnění schvalovatele a návaznost na pravidla školy:** [DOPLNÍ SE]
- **Datum rozhodnutí:** [DOPLNÍ SE]
- **Rozsah rozhodnutí:** veřejný statický Conversation Lab, nikoliv celý ekosystém AI Studio, přístupové permity ani budoucí školní server
- **Klasifikace:** S0 – pouze pokud škola samostatně schválí návrh nové třídy / aktualizace GARP
- **Platnost rozhodnutí:** do další změny veřejných bajtů, vlastnictví hostingu nebo rizikového profilu; nejdéle do data [DOPLNÍ SE]

## Přesný předmět akceptace
- **Aplikace:** Conversation Lab GHRAB 0.9.2
- **Release ID:** `cl-ai-b1-pilot-20261018-r2`
- **SHA-256 kompletního veřejného 21souborového ZIP:** `eeca610e36ea3f11366297728af39510ee9541f8960de72c444ea6683a8f84c0`
- **SHA-256 ověřeného ES256 prohlášení vlastníka obsahu:** `6f0588801d7ec4bc5b3314a4e351603cd6993890ef56b2a636ee497d0b3848c5`
- **Veřejná URL:** `https://conversation-lab-ghrab.pages.dev/`
- **Obsah:** 1 schválená lekce AI/EN/B1, 8 stanovišť, 37 offline českých glos
- **Uživatelé:** anonymní studentský veřejný přístup; učitelský odkaz z AI Studia je samostatná provozní integrace

## Zprávy a důkazy
- [ ] Claude Opus oponentura z 18. 10. 2026 — technická AI revize, nikoliv lidská certifikace
- [ ] Přesná integrita publikovaného balíčku + vlastnický ES256 souhlas
- [ ] Ověření *aktuálního* živého originu a všech veřejně servírovaných SHA-256
- [ ] Bezpečnostní hlavičky, 404/negative routes, QR, mobilní Safari/iPad
- [ ] Správa Cloudflare účtu, MFA, kontrola starých/preview deploymentů a rollback
- [ ] Vyjádření k informacím o provozních údajích hostingu / školní GDPR roli
- [ ] Bezpečnostní hranice učitelského spouštěče CLB-01 a potvrzení, že Studio neposílá přihlašovací údaje do veřejného webu
- [ ] Revize PR a vydávací P5 / bezpečné nasazení Studia

## Přijetí / nepřijetí konkrétních rizik
U každého řádku osoba s příslušnou pravomocí vyznačí `PŘIJÍMÁM`, `PODMÍNĚNĚ` nebo `NEPŘIJÍMÁM`, doplní důvod, opatření a termín.

| Nález | Riziko | Rozhodnutí | Opatření, odpovědná role a termín |
|---|---|---|---|
| F-01 LOW | Hashchange umožní zobrazit *veřejný* obsah na neschváleném originu ve vydání 0.9.2; oprava v budoucí 0.9.3 | [ ] | [DOPLNÍ SE] |
| F-03 MEDIUM | Hosting na osobním účtu, náhledové deploymenty a odpovědnost | [ ] | [DOPLNÍ SE] |
| F-04 LOW | Zpracování IP/technických údajů hostingem a informování uživatelů | [ ] | [DOPLNÍ SE] |
| F-05 LOW | Schvalovací přepínače Studia nejsou samostatně podepsané | [ ] | [DOPLNÍ SE] |
| F-06 LOW | Výjimka admin ze školení, server-session kontrola mimo rozsah | [ ] | [DOPLNÍ SE] |

## Rozhodnutí instituce
[ ] Souhlasím s **omezeným veřejným pilotem**, pouze po úspěšném ověření živé verze a splnění uvedených podmínek; žádné automatické otevření AI Studia.

[ ] Souhlasím s **provozem jako školní služby a následnou integrací do Studia**, ale pouze po samostatném vydávacím P5 a splnění všech výše označených opatření. Toto není povolení obejít P5.

[ ] **Neschvaluji**; projekt zůstává v PRELIVE_HOLD.

**Odůvodnění a rozsah podmínek:** [DOPLNÍ SE]

**Podpis schvalující osoby nebo autentizovaný záznam rozhodnutí:** [DOPLNÍ SE]

**Vyjádření školní osoby pro ochranu osobních údajů (pokud relevantní):** [DOPLNÍ SE]

## Bezpečnostní upozornění k evidenci
Tento Markdown **nikdy není sám o sobě `SIGNED_AND_VERIFIED`**. Nelze jej použít jako oprávnění přepsat `launch-control.json` ani `independentSecurityApproval`. Po schválení vznikne samostatná verze se jménem, datem, přesným otiskem, doloženým oprávněním a nezpochybnitelným rozhodnutím. Také bude potřeba právně a technicky ověřit, že změna GARP odpovídá rozhodnutí oprávněné instituce.

**Současný stav 18. 10. 2026: NEROZHODNUTO — žádný institucionální podpis či schválení nebylo přiloženo.**
