# Aktualizace AI Studio GHRAB 0.21.3

## Důvod hotfixu

GitHub Actions ve finální P5 R2 bráně odhalily reálnou regresi domovské stránky. Test offline startu naměřil pouze 4 karty aplikací online i offline místo požadovaných 8 (`onlineCards: 4`, `offlineCards: 4`). Service worker přitom fungoval správně.

## Příčina

AI Studio používá model **Top 4 + Další aplikace**. Funkce `renderExtraApps()` po odstranění starého bloku `mission-strip` stále vkládala sekci „Další aplikace“ pomocí tohoto již neexistujícího prvku. Vytvořené karty proto nebyly připojeny do DOM. Nešlo o chybu offline cache ani o oprávnění uživatele.

## Oprava

- `renderExtraApps()` vkládá sekci před stabilní `.value-section`;
- pokud tato sekce není dostupná, použije se bezpečný fallback do `<main>`;
- zachován je model 4 prioritních aplikací kolem brány + 4 dalších aplikací v katalogu;
- přidána statická regresní kontrola, která zakazuje návrat závislosti na odstraněném `mission-strip`;
- stávající browserový offline test nadále vyžaduje 8 karet online i offline.

## Dopad

Oprava nemění oprávnění, školení, role, manuály, Materiály ani server-ready funkce z verzí 0.21.1–0.21.2. Opravuje pouze chybějící vykreslení druhé poloviny katalogu aplikací na domovské stránce.
