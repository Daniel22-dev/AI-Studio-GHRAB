# AI Studio GHRAB 0.21.44 — final validation

Datum: 2026-09-06

## Prezentační film

- Výstup: `src/assets/presentation/ai-studio-ghrab-showcase-2026-4k.mp4`
- 3840×2160, 30 fps, H.264 + AAC, délka 91,7 s.
- Úvodní motion stall kolem 4,8–5,1 s byl nahrazen plynulým přechodem bez duplicitních po sobě jdoucích snímků v kontrolovaném úseku 4,0–6,5 s.
- MP4 používá faststart a pravidelný 1s GOP; prezentační přehrávač používá `preload=auto`.
- Poster je 3840×2160.

## Maturita Desk

- Showcase obsahuje Maturita Desk 1.0.3 jako devátou child aplikaci.
- Prezentační scéna používá pouze syntetický/demo obsah.
- Ve filmu není reálný `.mdesk` Content Pack, přístupová fráze ani soukromý podpisový klíč.

## Ověření

- `npm test` — PASS.
- `npm run build:school-server` — PASS.
- `npm run qa:quality` — 188/188 PASS, 0 warnings.
- Maturita Desk external-launcher regression — PASS.
- Lazy-media single-file budget — PASS (`56 599 822 <= 60 000 000 B`).
- Prezentační média zůstávají mimo PWA precache.

Bezpečnostní logika GARP 2.3 se proti 0.21.43 nemění; 0.21.44 je media/UX patch.
