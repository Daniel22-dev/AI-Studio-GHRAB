# AI Studio GHRAB 0.21.34

## Co tato aktualizace řeší

Verze 0.21.34 spojuje dvě opravy, které vznikly během závěrečného nasazovacího ověřování:

1. synchronizace registru mohla po úspěšném načtení aplikací skončit falešnou chybou screenshotového regresního testu, protože Chromium ještě nedokončilo načtení blob náhledu;
2. při návratu z uzamčené aplikace vložené ve Studiu se mohl odkaz otevřít jen uvnitř iframe, čímž vzniklo vnořené AI Studio se dvěma horními lištami. Obecné CSS vložené aplikace navíc mohlo znečitelnit sekundární tlačítko brány.

## Opravy

- screenshotová regrese čeká na skutečně načtený náhled; skutečné porušení CSP zůstává blokující chybou;
- odkazy „Otevřít AI Studio“ a „Aktivovat přístup“ při vložení míří do hlavního okna;
- viewer rozpozná již vzniklé vnoření a bezpečně je opustí;
- tlačítka přístupové brány mají izolované styly odolné vůči CSS vložené aplikace;
- přidány regresní kontroly těchto integračních oprav.

## Beze změny

Podepsaná bezpečnostní konfigurace, revokace, veřejné klíče, vydaná oprávnění i produkční runtime reportéru se nemění. Synchronizované registry aplikací vycházejí z novější opravy 0.21.34 a nebyly nahrazeny staršími lokálními snapshoty.

## Nasazení

Nejprve nasaďte Generátor testů 7.1.17 a počkejte na zelený deploy. AI Studio 0.21.34 nahrajte až poté, aby jeho synchronizační workflow načetlo aktuální manifest Generátoru.
