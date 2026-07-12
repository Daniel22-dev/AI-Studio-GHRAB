# AI Studio GHRAB 0.7.2 — komentář změn

## Důvod změny

Původní katalog otevíral `manualUrl` s `target="_blank"`. V nainstalované PWA Windows takový odkaz předal běžnému prohlížeči, protože cílová adresa manuálu leží mimo rozsah PWA AI Studia.

## Nové řešení

- Karta manuálu nyní přechází na interní stránku `manualy/viewer.html?app=<id>`, která zůstává v rozsahu PWA.
- Interní stránka znovu kontroluje podepsané oprávnění ke konkrétní aplikaci.
- Teprve poté vloží aktuální `manualUrl` do celoobrazovkového rámce.
- Manuál se nadále aktualizuje spolu s aplikací; AI Studio neuchovává jeho kopii.
- Lišta prohlížeče nabízí návrat, obnovení a nouzové otevření mimo PWA.
- Rámec povoluje fullscreen, takže tlačítko v samotném manuálu zůstává funkční.

## Bezpečnost

Prohlížeč přijme pouze HTTPS adresu z povoleného originu GitHub Pages a nepřeskakuje kontrolu oprávnění. Uzamčený uživatel se k rámci manuálu nedostane.
