# Aktualizace AI Studio GHRAB 0.21.2

## Cíl

Doplnit plnohodnotný manuál nadřazeného portálu AI Studio GHRAB tak, aby učitel a administrátor nedostávali stejný balík informací. Současně nabídnout první pomoc novému uživateli bez dalšího výrazného panelu na domovské stránce.

## Manuál učitele

Nová stránka `src/manualy/ai-studio-teacher.html` vysvětluje pouze běžný provoz:

- jak začít přes Aplikace,
- význam horních záložek,
- Materiály dnes vs. po připojení školního serveru,
- kdy použít Bezpečnost,
- Můj přístup a měsíční anonymní souhrn,
- bezpečné ukončení práce na sdíleném zařízení,
- hlášení chyby,
- explicitní seznam věcí, které běžný učitel nemusí řešit.

## Manuál administrátora

Nová stránka `src/manualy/ai-studio-admin.html` obsahuje běžný základ a navíc:

- přesné vysvětlení Správy a Prezentace,
- workflow vydávání, evidence a revokace přístupů,
- vztah měsíčních souhrnů učitelů k Pilotnímu dashboardu a souhrnnému reportu,
- release a QA odpovědnosti,
- serverovou připravenost sdílených materiálů.

Stránka používá `data-page="manual-admin"`, v centru Manuálů je dostupná pouze správci a vlastní `ai-studio-admin.js` po ověření permitu zablokuje obsah pro ne-admin roli. Tím není změna závislá na novém podpisu centrálního access bundle.

## Poprvé v AI Studiu

Na hlavní stránce je pod stavem Studia pouze krátký textový odkaz. Učitel dostane odkaz na manuál učitele, administrátor na rozšířený manuál administrátora. Nejde o další kartu, modal ani povinný onboarding a odkaz proto nenarušuje hlavní launcher aplikací.

## Regrese

`test:studio-ux` nově ověřuje oba role-specific manuály, jejich odkazy, správcovskou gate a nenápadný první průvodce na domovské stránce.
