# AI Studio GHRAB 0.21.34 — finální integrační oprava

## Výsledek

Verze 0.21.34 zachovává opravu screenshotové QA synchronizace a současně doplňuje opravy chování přístupové brány uvnitř vložených aplikací.

## Technické změny

- screenshotový test čeká na stav `img.complete` a nenulovou `naturalWidth`; při skutečném zablokování blob náhledu CSP stále selže fail-closed;
- odkazy „Otevřít AI Studio“ a „Aktivovat přístup“ používají při běhu v iframe cíl hlavního okna;
- viewer se při nechtěném vnoření přesune do top-level okna;
- primární i sekundární tlačítko přístupové brány má explicitní izolované pozadí, barvu a okraj;
- statické regresní testy ověřují top-level navigaci i izolaci stylů.

## Beze změny

- podepsaný access bundle `access-p1-20260824175535Z-k_wtm7Zj`;
- revokační seznam a kryptografické veřejné klíče;
- platnost již vydaných oprávnění s výjimkou dříve cíleně zneplatněného JTI;
- produkční runtime centrálního reportéru.

## Důležitá integrační poznámka

Finální zdroj je založen na pozdější opravě 0.21.34 po pádu synchronizační QA. Neobsahuje starší lokální snapshoty registru, které by vracely některé aplikace na dřívější verze.
