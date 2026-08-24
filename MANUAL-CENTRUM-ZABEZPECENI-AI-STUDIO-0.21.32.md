# Srozumitelný manuál: zneplatnění starého přístupu

Tento postup použijte až po nasazení AI Studia 0.21.32. Nepotřebujete PowerShell, příkazovou řádku ani ruční úpravu zdrojového kódu.

## Co si připravit

- soubor současného zdrojáku AI Studia v ZIPu;
- soubor `SOUKROMY-KONFIGURACNI-KLIC-NEPOSILAT…json`, který vznikl při zabezpečení verze 0.21.31;
- přihlášené hlavní správcovské oprávnění v AI Studiu.

Soukromý konfigurační klíč není klíč, kterým vydáváte oprávnění kolegům. Oba druhy klíčů fungují vedle sebe a nesmějí se zaměnit.

## A. Připravit starý přístup

1. Otevřete AI Studio a zvolte **Správa → Evidence přístupů**.
2. Najděte starý profil nebo oprávnění kolegyně.
3. Otevřete **Detail**.
4. Zvolte **Připravit zneplatnění**.
5. Záznam nemažte. Stav se má změnit na **Připraveno ke zneplatnění**.

Tento krok může provést i zástupce správce. Ještě ale nedochází ke skutečnému zablokování.

## B. Vytvořit podpis u vás v počítači

1. Jako hlavní správce otevřete **Správa → Centrum zabezpečení**.
2. Zkontrolujte, že Studio hlásí platný podpis a ukazuje správný počet čekajících JTI.
3. Klikněte na **Vybrat soukromý konfigurační klíč**.
4. Vyberte soubor, jehož název začíná `SOUKROMY-KONFIGURACNI-KLIC-NEPOSILAT`.
5. Klikněte na **Vytvořit veřejný aktualizační balíček**.
6. Prohlížeč stáhne soubor začínající `VEREJNA-AKTUALIZACE-ZABEZPECENI-AI-STUDIO`.

Studio soukromý klíč nikam neodesílá. Po vytvoření podpisu jej ihned vymaže z paměti. Kdybyste stránku nechali otevřenou bez podpisu, klíč se vymaže nejpozději po deseti minutách.

## C. Co nahrát do dalšího vlákna

Nahrajte pouze:

1. aktuální ZIP zdrojáku AI Studia;
2. veřejný soubor `VEREJNA-AKTUALIZACE-ZABEZPECENI-AI-STUDIO…json`.

Soubor `SOUKROMY-KONFIGURACNI-KLIC-NEPOSILAT…json` nenahrávejte ChatGPT, Claudovi, na GitHub, do e-mailu ani na společný disk.

ChatGPT veřejný balíček nezávisle ověří, začlení jej do zdrojáku, spustí testy a připraví kandidáta pro Claude. Po maximálně dvou kontrolních kolech nasadíte zelenou verzi.

## D. Kdy je starý přístup skutečně zablokovaný

Až po nasazení nové verze AI Studia s novým podepsaným bundle. Potom znovu otevřete Evidenci přístupů online. Starý záznam má mít stav **Centrálně zneplatněno**.

## Důležité odpovědi

- Nemusíte vytvářet nový klíč každý měsíc. Používáte stále stejný konfigurační klíč, dokud se záměrně nerotuje nebo není podezření na jeho únik.
- Soukromé podpisové klíče pro vydávání oprávnění kolegům dál fungují. Centrum zabezpečení používá jiný klíč.
- Zástupce správce nepotřebuje a nemá dostat konfigurační soukromý klíč.
- Samotné odstranění záznamu z místní evidence přístup nezablokuje.
