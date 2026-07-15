# AI Studio GHRAB v0.16.6 — oprava GitHub buildu

## Co se stalo

Build se zastavil v kroku `Install dependencies`, kde běžel příkaz `npm ci`. Důvodem nebyla animace ani velikost Studia. Soubor `package-lock.json` obsahoval odkaz na interní registr balíčků používaný v pracovním prostředí při přípravě balíčku. GitHub Actions k této adrese nemá přístup.

## Co bylo opraveno

- odkaz na Prettier byl změněn na oficiální `https://registry.npmjs.org/`;
- workflow výslovně používá veřejný npm registr;
- zapnuta cache npm podle `package-lock.json`;
- instalace používá `npm ci --no-audit --no-fund`;
- instalační krok má limit 4 minuty, aby se případný síťový problém nezasekl bez konce;
- verze zvýšena na 0.16.6.

## Co se neměnilo

Vzhled, elegantní launch animace, instalace PWA, přístupy ani ostatní funkce verze 0.16.5 nebyly odstraněny ani přepracovány. Jde o technický hotfix nasazení.
