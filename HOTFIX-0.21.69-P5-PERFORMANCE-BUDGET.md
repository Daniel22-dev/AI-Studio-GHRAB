# AI Studio GHRAB 0.21.69 - P5 performance budget hotfix

Datum: 2026-09-15

GitHub Actions po nasazeni 0.21.69 zastavil krok `Enforce P5 R2 release gate` pouze na dvou vykonovych rozpoctech v `qa:quality`:

- `distBytes`: 2 406 722 B > 2 400 000 B,
- `entryCriticalBytes`: 513 874 B > 500 000 B.

Funkcni, bezpecnostni a platformni kontroly pred timto bodem prosly. Limity nebyly navyseny.

Oprava:

- `assets/brand/portal-gateway.webp` byl znovu zakodovan jako kvalitni WebP se zachovanim rozmeru 760x760,
- `assets/brand/apple-touch-icon.png` byl bezztratove recomprimovan; obrazova data jsou pixelove shodna,
- zadna funkcionalita Reportu, Pohledu kolegy, manualu, pristupovych prav ani GARP nebyla zmenena.

Overeni po oprave:

- `qa:quality`: 194/194 PASS,
- `distBytes`: 2 388 678 B <= 2 400 000 B,
- `entryCriticalBytes`: 497 187 B <= 500 000 B,
- `precacheBytes`: pod limitem,
- `largestFileBytes`: pod limitem,
- `qa:xss`: PASS, bez noveho nebezpecneho sinku,
- `qa:platform`: PASS,
- `qa:ecosystem`: PASS.

Verze zustava 0.21.69, protoze jde o opravu artefaktu, ktery v CI neprosel release gate; nevznikla uspesne vydana 0.21.69, ze ktere by bylo nutne delat novy funkcni release.
