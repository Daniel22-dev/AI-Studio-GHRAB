# Zadání a měsíční report — rychlý postup

Otevřete **Report → Zadání a nové aplikace**. Vše je na stejné stránce jako evidence práce a PDF pro vedení.

1. **Nové zadání.** Zadejte výsledek, rozsah, termín a čas, součinnost školy, odměňování, náklady, data a práva. Rozpracovaný návrh můžete průběžně ukládat. Nová aplikace dostane vlastní označení a název; nemusí ještě být v katalogu.
2. **Souhlas obou stran.** Uzavřete zadání a stáhněte kartu PDF. Tu pošlete ředitelce a uchovejte podepsanou listinu nebo průkazné elektronické souhlasy obou stran se stejným ID a verzí. Ve Studiu zapište data a odkazy na doklady. Samotné označení „schváleno“ není podpis ani důkaz oprávnění.
3. **Práce a předání.** Tlačítko „Vykázat práci k této kartě“ předvyplní její ID a verzi v evidenci práce. Po dokončení zaznamenejte skutečnou verzi aplikace, neměnný archiv/commit a převzetí. Schválená karta nové aplikace podle dokumentů 9.2 doplňuje smluvní seznam aplikací.
4. **Nasazení.** Zaznamenejte rozhodnutí školy po konkrétním posouzení IT a ochrany údajů. Zařazení a zpřístupnění aplikace v katalogu je další technický krok. Karta aplikaci sama nezapíná.

Běžné opravy, podpora a školení se vykazují přímo do evidence práce. Nová aplikace, migrace na školní server nebo centrální přihlášení mají samostatné zadání. Kategorie „Nová aplikace / mimořádný projekt“ v evidenci práce pouze popisuje vykázanou činnost; sama práci neschvaluje. Skutečně odvedenou přípravu lze evidovat i před schválením, její vykázání však nepovoluje další vývoj.

## Co poslat ředitelce

- Měsíční report: stále **dvě strany PDF**. Vyberte období, doplňte souhrn a stáhněte report. Obsahuje stručné vazby na karty vykázané práce a čekající zadání.
- K rozhodnutí: **samostatnou kartu PDF** se stejným ID a verzí, na kterou odkazuje report. Lze ji poslat kdykoli během měsíce.
- Podle potřeby: tlačítko **Přehled karet PDF** vytvoří samostatný úplný přehled registru.

Změna uzavřeného rozsahu, kapacity či podmínek vyžaduje **novou verzi zadání a nové souhlasy**. Starší záznam zůstává dohledatelný. Zápis ukončení pouze eviduje skutečnou dohodu či jiný doložený důvod; nenahrazuje právní jednání.

## Záloha a soukromí

Registr karet je v tomto vydání uložen **v tomto prohlížeči**, nesynchronizuje se mezi zařízeními. Pravidelně použijte **Záloha karet JSON** a soubor uložte do určeného neveřejného školního úložiště. Obnova po potvrzení nahradí celý místní registr. Samostatně uchovávejte původní souhlasy a předávací doklady; JSON jejich pravost neověřuje. Úplné smazání dat nebo ukončení práce na sdíleném zařízení odstraní i místní karty. Soukromé poznámky u práce se do reportu PDF nedávají.

## Návaznost na dokumenty 9.2

Novou výši osobního příplatku doplní škola před podpisem a začátkem role. Pole odměňování v kartě je záměrně bez předvyplněné částky. Může popsat odsouhlasený platový režim, nemusí zavádět samostatnou cenu za aplikaci. Sjednaná kapacita musí odpovídat plnému učitelskému úvazku. Dohoda počítá s rolí od doplněného začátku do 31. 8. 2027, průběžným zhodnocením do 15. 2. 2027 a souhrnným jednáním do 30. 6. 2027.

## Ověření vydání 0.21.59

Prošly projektové testy `npm test`, sestavení školního profilu a prohlížečová kontrola: návrh, PDF karty, souhlasy, práce nové aplikace, předání, nasazení, nová verze, dvoustránkové PDF, mobilní šířka, obnova registru a zachování formuláře při selhání úložiště. Integrační prohlížečová kontrola používá testovací oprávnění a data; nenahrazuje posouzení skutečného školního provozu ani nezávislé bezpečnostní ověření.
