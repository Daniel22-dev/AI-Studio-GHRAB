# AI Studio GHRAB 0.21.56 — PWA-safe přechod do AI Akademie

Datum: 2026-09-11

## Změny

- Adminská záložka **AI Akademie** se nyní otevírá v samostatné kartě nebo okně (`target="_blank"`).
- Nainstalovaná PWA AI Studia proto neopustí svůj vlastní scope a Chrome již při přechodu do Akademie nevkládá bílou out-of-scope lištu.
- Nový kontext používá `rel="noopener noreferrer"`; nepředává se žádný permit, token ani jiný tajný údaj.
- Viditelnost zůstává beze změny: záložku vidí pouze plný správce, nikoli učitel ani zástupce správce.
- Verze a PWA cache byly zvýšeny na **0.21.56**, aby se oprava spolehlivě propsala i přes existující service-worker cache.

## Bezpečnostní dopad

Beze změny přístupového modelu. Oprava pouze odděluje navigaci mezi dvěma samostatnými PWA scope a zabraňuje tomu, aby Studio navigovalo svůj vlastní aplikační kontext na sourozeneckou GitHub Pages cestu.
