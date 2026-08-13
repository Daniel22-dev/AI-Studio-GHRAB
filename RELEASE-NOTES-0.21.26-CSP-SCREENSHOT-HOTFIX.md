# AI Studio GHRAB 0.21.26 — hotfix ukládání screenshotů

- Příčinou selhání nebylo snímání obrazovky ani pomocné video. Produkční CSP v `src/index.html` blokovala lokální `blob:` URL, kterou reportér vytváří pro zpracování a náhled zachyceného obrázku.
- Direktiva `img-src` nyní povoluje `blob:` stejně jako serverový bezpečnostní profil AI Studia.
- Regresní sada nově testuje skutečný produkční index, reálný canvas MediaStream, vytvoření screenshotu a načtení jeho blob náhledu.
- Zachováno zůstává dvoukrokové stažení diagnostického ZIPu, ruční přiložení do Gmailu, limit pěti snímků, ochrana konceptu i skryté pomocné video uvnitř reportéru.
- Registr aplikací je dorovnán na LUDUS 1.16.13.
- Verze PWA cache je `ghrab-ai-studio-v0.21.26`.
