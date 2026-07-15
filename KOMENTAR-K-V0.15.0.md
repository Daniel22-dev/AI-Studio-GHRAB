# AI Studio GHRAB v0.15.0 — komentář k úpravě domovské obrazovky

## Zadání
Cíl byl jasný: přiblížit Studio vizuálně inspiraci z dodaného videa, ale zachovat školní použitelnost, existující logiku portálu a dobrou funkčnost na PC.

## Co jsem změnil
1. **Desktop-first filmový vzhled**
   - hlavní portálová sekce má nově výraznější prostorovou scénu,
   - přidal jsem holografické pozadí, hloubku, boční světelné sloupy a „digitální podlahu“,
   - celé rozhraní působí víc jako prémiová interaktivní řídicí konzole.

2. **Interaktivní 3D efekt na PC**
   - při pohybu myší se jemně naklání celá scéna,
   - centrální brána reaguje paralaxou,
   - jednotlivé karty aplikací dostaly vlastní mikro-pohyb a světelný odlesk.

3. **Lepší prezentace pro velkou obrazovku**
   - doplnil jsem informační lištu, která už na první pohled komunikuje prémiové rozhraní,
   - celé řešení je laděné primárně pro běh na počítači.

4. **Zachování použitelnosti**
   - nezměnil jsem logiku načítání aplikací, přístupů ani spouštění,
   - stávající animace „navolování brány“ zůstala zachována,
   - na mobilu a v režimu omezených animací se nové efekty automaticky zjednoduší.

## Co jsem záměrně nedělal
- Nešel jsem cestou extrémně těžkého WebGL/Three.js řešení.
- Důvod: pro školní praxi a GitHub Pages je lepší lehčí, stabilní a snadno spravovatelná varianta v HTML/CSS/JS.
- Výsledek je tedy vizuálně výraznější, ale pořád rozumně udržitelný.

## Technický komentář
Úpravy proběhly hlavně v těchto souborech:
- `src/index.html`
- `src/styles.css`
- `src/app.js`
- `src/config/changelog.json`
- `package.json`

## Verze
- zvýšeno na **v0.15.0**

## Ověření
- spuštěn kompletní testovací balík `npm test`
- výsledek: **všechny kontroly prošly**

## Doporučení pro další krok
Pokud budeš chtít, můžeme v dalším kroku ještě přidat některý z těchto prvků:
1. skutečně „plovoucí“ holografické panely se střídáním obsahu,
2. výraznější sekvenci otevření brány při spuštění aplikace,
3. prémiovější detail karet (např. mini live metriky, ikony režimů, stav školení),
4. samostatný „presentation mode“ pro promítání kolegům.
