# Zadání vývoje a měsíční report — rychlý postup

V **Reportu** jsou nyní dvě oddělené agendy:

- **Zadání vývoje** — samostatná karta pro novou aplikaci, větší změnu, migraci nebo integraci, která má být výslovně odsouhlasena a předána.
- **Měsíční report** — čtyři kroky: Provozní podklady → Evidence práce → Souhrn pro vedení → Náhled a PDF.

Běžná podpora, drobné opravy, konzultace a školení **nepotřebují kartu zadání**. Zapisují se rovnou do Evidence práce.

## Zadání vývoje

1. **Návrh zadání.** Založte kartu a vyplňte výsledek, rozsah, kapacitu a termín, součinnost školy/IT, pracovní režim a odměňování, náklady, bezpečnostní podmínky, komponenty a práva. Každé pole má přímo ve Studiu nápovědu a příklad. Rozepsaný návrh lze ukládat neúplný.
2. **K odsouhlasení.** Tlačítko **Uzavřít návrh a připravit k odsouhlasení** pouze zmrazí tuto verzi. Neznamená schválení, dokončení práce ani povolení nasazení. Po uzavření stáhněte PDF a **přiložte je k e-mailu ředitelce nebo jiné oprávněné osobě za školu**. Uchovejte doložitelný souhlas obou stran se stejným ID a verzí.
3. **Schválení a práce.** Po obdržení souhlasů je zapište do karty včetně odkazu na uložený doklad. Teprve schválená karta nabízí přímé **Zapsat práci k zadání**, které propojí pracovní záznam s konkrétní verzí karty.
4. **Předání.** Po dokončení zaznamenejte skutečně předanou verzi, neměnný commit/tag nebo archiv, datum, osobu přebírající za školu a doklad převzetí včetně případných výhrad.
5. **Nasazení.** Provoz je samostatné rozhodnutí školy po posouzení IT, dat a omezení konkrétního scénáře. Karta ani měsíční report aplikaci samy nezapínají.

Vybraná karta ve Studiu ukazuje stavový postup **Návrh → K odsouhlasení → Schváleno → Předáno → Nasazeno**, takže je vždy vidět, co je hotovo a co následuje.

## Co poslat ředitelce

- **K odsouhlasení konkrétního zadání:** samostatnou kartu PDF s přesným ID a verzí jako přílohu e-mailu. Měsíční report tento souhlas nenahrazuje.
- **Pravidelně za období:** dvoustránkový měsíční PDF report. První strana shrnuje anonymní provozní data; druhá práci garanta a manažerský souhrn.
- **Podle potřeby:** **Stáhnout přehled zadání (PDF)** vytvoří samostatný seznam evidovaných karet.

Změna uzavřeného rozsahu, kapacity nebo podmínek vyžaduje **novou verzi zadání a nové souhlasy**. Starší verze zůstává dohledatelná.

## Evidence práce

Evidence práce je místo pro skutečně odvedenou činnost. Záznam obsahuje datum, čas, kategorii, aplikaci/oblast, typ práce, stručný popis a výsledek. Pokud práce souvisí se schválenou kartou, vyberte ji; jinak ponechte **Bez karty – běžná agenda**.

Soukromá poznámka zůstává pouze v lokální evidenci a nepřenáší se do PDF ani anonymního JSON/CSV exportu. Do pracovních záznamů a manažerského souhrnu nevkládejte citlivé údaje studentů; případné podklady anonymizujte.

## Měsíční report

1. **Provozní podklady** — zvolte období, zkontrolujte lokální/anonymní data, případně importy kolegů a automatickou API spotřebu.
2. **Evidence práce** — zapište skutečně odvedenou práci za období.
3. **Souhrn pro vedení** — krátce doplňte výsledky, školení/podporu, rizika, potřebná rozhodnutí, priority a případné další přímé náklady.
4. **Náhled a PDF** — zkontrolujte obě strany a stáhněte barevnou nebo černobílou variantu.

## Záloha a soukromí

Registr karet je v tomto vydání uložen **v tomto prohlížeči** a nesynchronizuje se mezi zařízeními. Pravidelně použijte **Záloha karet JSON** a soubor uložte do určeného neveřejného školního úložiště. Samostatně uchovávejte původní souhlasy a předávací doklady; JSON jejich pravost neověřuje.

## Návaznost na dokumenty 9.2

Novou výši osobního příplatku doplní škola před podpisem a začátkem role. Pole odměňování v kartě je záměrně bez předvyplněné částky. Může popsat odsouhlasený platový režim, nemusí zavádět samostatnou cenu za aplikaci. Sjednaná kapacita musí odpovídat plnému učitelskému úvazku. Dohoda počítá s rolí od doplněného začátku do 31. 8. 2027, průběžným zhodnocením do 15. 2. 2027 a souhrnným jednáním do 30. 6. 2027.

## Ověření vydání 0.21.61

Release kontroluje logiku životního cyklu karty, oddělení běžné práce od zadání, nápovědu polí, explicitní krok s PDF k odsouhlasení, vazbu na evidenci práce, předání, nasazení, novou verzi zadání a dvoustránkový report. Browserové a release QA se spouští nad výsledným buildem stejně jako u předchozích P5 vydání.
