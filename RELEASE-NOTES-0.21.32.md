# AI Studio GHRAB 0.21.32 — Centrum zabezpečení

## Výsledek

Verze 0.21.32 převádí technický postup zneplatnění oprávnění do srozumitelného správcovského rozhraní. Hlavní správce už nemusí ručně přepisovat revokační JSON ani posílat soukromý konfigurační klíč vývojáři nebo kontrolnímu modelu.

## Co se změnilo

- ve **Správa → Centrum zabezpečení** lze zkontrolovat současný podepsaný bundle, připravená JTI a datum konce jeho platnosti;
- soukromý konfigurační klíč se načte pouze do paměti otevřeného okna, neukládá se do `localStorage` ani `sessionStorage` a vymaže se po podpisu, po deseti minutách nebo při opuštění stránky;
- Studio před podpisem ověří současný bundle i shodu soukromého klíče s veřejným trust anchorem;
- nový bundle zachová politiku i veřejný klíč uživatelských oprávnění, sjednotí dosavadní a připravená JTI, vytvoří jedinečnou verzi a po podpisu ji znovu kryptograficky ověří;
- výsledkem je pouze veřejný balíček `ghrab-access-config-update-pack-v1`, který neobsahuje soukromou složku `d`;
- Evidence přístupů načítá skutečně nasazené revokace z podepsaného bundle a vede hlavního správce do Centra zabezpečení;
- samostatný validátor a behaviorální testy ověřují podpis, kontinuitu bezpečnostních nastavení, ochranu klíče a odmítnutí cizího klíče.

## Hranice rolí

Zástupce správce může v Evidenci přístupů označit starý přístup jako připravený ke zneplatnění. Nemá přístup k Centru zabezpečení, nevytváří kryptografický podpis a nedostává soukromý konfigurační klíč. Dokončení provádí hlavní správce.

## Co se nezměnilo

Konfigurační trust anchor `ghrab-access-bundle-20260822195407Z-fxjS8DK9`, dosavadní podepsaný bundle a klíč `ghrab-2026-07-10-6449ca2a` pro uživatelská oprávnění se v samotném vydání 0.21.32 nemění. Již vydaná platná oprávnění proto pokračují do expirace nebo do skutečně nasazené revokace.

## Důležitá provozní vlastnost

Stažení veřejného balíčku ještě nikoho neblokuje. Revokace začne platit až po nezávislém ověření, začlenění balíčku do zdrojáku, zelených testech a nasazení nové verze.
