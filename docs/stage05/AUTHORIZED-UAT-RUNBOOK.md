# Stage 05 — autorizovaný browser UAT (desktop + mobil)

**Režim:** pouze legitimně aktivované přístupy, syntetické materiály, bez exportu přístupových údajů. **Kritérium vydání:** všech šest skutečných importů PASS a aktuální P5 PASS na stejném vydávaném commitu.

## Výchozí situace

Dřívější automatický běh [40014180298](https://github.com/Daniel22-dev/AI-Studio-GHRAB/actions/runs/40014180298) nedokázal potvrdit import: všechny tři aplikace zobrazily legitimní bránu *Tato aplikace je uzamčena*. Nejde o důkaz chyby Bridge a test nesmí bránu obcházet. Samotné testování lokálního Bridge v AI Studiu nenahrazuje browser E2E.

## Spuštění na počítači oprávněného učitele / správce

1. Na důvěryhodném počítači s Node.js a Chrome použijte aktuální zdroj AI Studia; nainstalujte zamčené závislosti příkazem `npm ci --ignore-scripts`. Nekopírujte do repozitáře žádné školní přístupové kódy.
2. V interaktivním terminálu spusťte `node tests/stage05/consumer-browser-uat.mjs --manual-authorized`. Tento režim nelze spustit v CI bez interaktivního terminálu.
3. Script otevře viditelné samostatné okno Chrome. Pokud je cílová aplikace uzamčená, řádně ji aktivujte přes standardní tlačítko **Aktivovat přístup** a schválený proces AI Studia. Kód zadávejte výhradně do oficiálního uživatelského rozhraní aplikace, **nikdy do terminálu či testovacích souborů**. Poté potvrďte Enter.
4. Test v rámci stejného izolovaného profilu provede 3 aplikace × 2 velikosti obrazovky: **Generátor**, **Diferenciátor**, **LUDUS**; Chrome profil sdílí mezi kontrolami, ale každou relaci znovu ověří. Nic nezveřejňuje ani neposílá na AI API.
5. Výsledek zkontrolujte v `qa-results/stage05/real-consumers/results.json`. Vyžaduje se **šest výsledků `pass`**, potvrzení importu konkrétního syntetického materiálu, návratové URL a pro každý případ ověřená událost převzetí **Bridge v2** (`contractVersion: 2`). UAT záměrně zakazuje legacy fallback, aby se chyba v Bridge v2 neskryla. Každé `AUTHORIZATION_REQUIRED` či `fail` znamená **NO-GO**, nikoli důvod oslabit přístupovou politiku.

## Bezpečnost a omezení

- UAT **neukládá aktivaci do `storageState.json`**, nepřebírá uživatelův běžný Chrome profil a automaticky maže svůj dočasný izolovaný profil po dokončení. Interaktivní Chrome se školním přístupem běží se zapnutou izolací Chromium (`chromiumSandbox: true`) a **nepořizuje žádné snímky obrazovky**, ani snímky přístupové brány. Diagnostika je omezená na booleany a cestu.
- Handoff obsahuje výhradně syntetické materiály, bez jmen studentů. Negativní testy kontrolují PII, XSS, neplatné TTL, přepis nedokončeného přenosu a MC4 se dvěma možnostmi.
- Neinteraktivní běh bez přístupu pravděpodobně skončí `AUTHORIZATION_REQUIRED`; to je správné bezpečnostní chování a není to úspěšný E2E import.
- Test emuluje mobilní viewport v Chrome. Nenahrazuje skutečný test Safari na iPhonu/iPadu; ten je samostatný akceptační bod při relevantním BYOD scénáři.
- Profil a autentizační data se do GitHubu, chatů, příloh ani CI artifactů nikdy neposílají.
- Aktivace samotná je skutečným externím předpokladem; bez ní se nesmí označit etapa 05 za dokončenou ani odstranit `Draft` u produkčního PR.


## Certifikovaná povaha testu

- Jde o **skutečný HTTP import z aktuálně zveřejněných tří aplikací** v dočasném autorizovaném prohlížeči, ne o lokální náhradu uživatelského rozhraní příjemců. Syntetická je pouze zdrojová učební látka.
- Testovaný odesílatel požaduje pouze protokol `ghrab-studio-handoff-v2` a záměrně nevytváří `ghrab-handoff-v1`; při převzetí musí vzniknout nová událost `contractVersion: 2`. Import přes legacy fallback proto nemůže vytvořit PASS.
- Autorizace není poskytována skriptem a není získávána z uloženého běžného profilu uživatele. Pokud ji aplikace odmítá, zůstává `AUTHORIZATION_REQUIRED` a vydání **NO-GO**.
- Pro platné závěrečné rozhodnutí zapisujte testovaný přesný SHA `candidate`, šest PASS, použitý prohlížeč, dostupné verze příjemců a nezávislý úspěch aktuálního P5. Neoslabujte pravidla proto, abyste dosáhli zeleného výsledku.

**Rozhodnutí:** zdokumentovat přesný SHA testovaného Studia a verzí spotřebitelů. Po šesti PASS a zeleném kompletním P5 lze teprve uzavřít finální akceptaci a provést Safe Promotion `candidate → main`.
