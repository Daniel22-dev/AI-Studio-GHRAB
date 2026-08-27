# AI Studio GHRAB 0.20.16 – hotfix mobilního Nastavení

## Opravená chyba

GitHub QA správně zastavil vydání 0.20.15 na kritickém workflow `STUDIO-CHROME-CONTROLS`. Na mobilním viewportu 390 × 844 byl po otevření Nastavení přepínač CZ/EN v DOM, ale nebyl viditelný.

Příčinou byl konflikt v `polish.css`: pozdější pravidlo `.header-actions .segmented { display: none; }` skrylo jazykový přepínač i poté, co jej JavaScript přesunul z hlavičky do panelu Nastavení.

## Řešení

Mobilní pravidlo nyní skrývá pouze původní přímý prvek v hlavičce pomocí `.header-actions > .segmented`. Přepínač přesunutý do `.settings-panel` proto zůstává viditelný a kliknutelný. Kritický browser test nebyl oslaben ani obcházen.

Verze byla zvýšena na 0.20.16, aby se změněný CSS soubor oddělil od PWA cache verze 0.20.15.
