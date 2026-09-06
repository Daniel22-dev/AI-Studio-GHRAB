# AI Studio GHRAB 0.21.44 – 4K Showcase

Datum: 2026-09-06

## Co se mění

- Prezentační film v `Prezentace` je nahrazen novým 4K masterem `3840×2160 / 30 fps`.
- Délka zůstává `91,7 s`; původní AAC zvuková stopa zůstává beze změny.
- Krátký motion stall kolem `4,8–5,1 s` byl odstraněn novým plynulým přechodem stejné délky.
- MP4 má `faststart` a keyframe každou 1 sekundu pro lepší start/seek v HTML5 videu.
- Film používá nový název `ai-studio-ghrab-showcase-2026-4k.mp4`, takže prohlížeč nemůže omylem použít starou QHD cache.
- Poster je rovněž `3840×2160`.
- Do filmu je doplněna nová aplikace **Maturita Desk 1.0.3** jako devátá aplikace ekosystému; prezentační scéna používá výhradně syntetický/demo obsah a neobsahuje reálný maturitní Content Pack ani přístupovou frázi.
- `src/demo/demo.js` používá `preload = "auto"`, aby se při otevření záložky Prezentace přednačetly první části filmu.

## Performance

- 4K MP4: `55 216 447 B` (~52,7 MiB).
- lazy-media limit zůstává `60 000 000 B` na soubor a `65 000 000 B` celkem.
- Prezentační média nadále nejsou součástí PWA offline precache.

## Bezpečnost

Bezpečnostní logika GARP 2.3 se proti 0.21.43 nemění. Verze 0.21.44 je prezentační media/UX patch; stávající release blokace a požadavek nezávislého ověření zůstávají platné.
