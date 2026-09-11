# AI Studio GHRAB v0.17.1 — oprava spuštění a aplikace uvnitř Studia

## Co bylo špatně

Předchozí verze při kliknutí okamžitě otevřela nové okno `about:blank`, aby prohlížeč pozdější otevření aplikace neblokoval. Toto prázdné bílé okno však převzalo pozornost. Animace prstenců i samostatná animace aplikace mezitím správně běžely v původním Studiu, ale uživatel je neviděl.

Proto vznikal přesně popsaný problém:

1. kliknutí otevřelo bílou stránku;
2. několik sekund se zdánlivě nic nedělo;
3. animace probíhala skrytě v okně Studia;
4. teprve potom se bílá stránka změnila na cílovou aplikaci.

## Co jsem opravil

### 1. Žádné automatické nové okno

Ze spuštění jsem úplně odstranil automatické `window.open("about:blank")`. Kliknutí již nepřesměruje pozornost do bílé karty ani nevytváří další záložku.

### 2. Dvě viditelné fáze přímo ve Studiu

Po kliknutí proběhne ve stejném okně:

1. **přesně dvě sekundy otáčení prstenců hlavní brány AI Studia**;
2. **samostatná celoplošná animace konkrétní aplikace**, včetně její ikony, názvu a barvy.

Teprve po dokončení druhé fáze se přejde do pracovního prostoru aplikace.

### 3. Aplikace uvnitř AI Studia

Přidal jsem novou interní stránku `app/`, která cílovou aplikaci zobrazí uvnitř Studia v plnohodnotném vloženém pracovním prostoru.

Uživatel má stále k dispozici:

- návrat do AI Studia;
- opětovné načtení aplikace;
- režim celé obrazovky;
- volitelné otevření aplikace samostatně, pouze když to sám zvolí.

Výchozí chování tedy již nezahlcuje prohlížeč dalšími kartami.

### 4. Viditelné prstence i na běžném PC

Automatický režim dříve mohl vyhodnotit běžný čtyřjádrový počítač jako úsporný a zkrátit animaci prstenců na 0,9 sekundy. Na desktopu se nyní plný režim nesnižuje jen podle počtu jader nebo hlášené paměti. Prstence v plném i úsporném režimu běží dvě sekundy, pokud uživatel animace výslovně nevypnul nebo nemá systémové omezení pohybu.

### 5. Instalace na PC

Karta **Nainstalovat AI Studio** vpravo dole zůstala zachována. Nadále:

- spouští systémovou instalaci, když ji Chrome nebo Edge nabídne;
- jinak zobrazí postup instalace;
- nezobrazuje se uvnitř již nainstalované PWA;
- lze ji dočasně skrýt.

## Bezpečnost a omezení

Současné registrované aplikace používají stejný webový původ jako Studio, proto je lze bezpečně zobrazit v interním pracovním prostoru. Pro budoucí aplikaci umístěnou na jiné doméně pracovní prostor zobrazí vysvětlení a nabídne pouze ruční otevření samostatně.

## Kontroly

Doplnil jsem regresní testy, které hlídají:

- že se již nepoužívá `about:blank` popup;
- že spuštění skutečně míří na interní stránku `app/`;
- že build obsahuje HTML, JavaScript i CSS pracovního prostoru;
- že zůstává dvousekundová fáze prstenců;
- že zůstává instalační nabídka PWA.
