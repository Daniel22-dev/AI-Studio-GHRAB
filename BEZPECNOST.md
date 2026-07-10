# Bezpečnostní hranice AI Studio GHRAB 0.5.1

## Co serverless portál dělá

- načítá vlastní statické soubory a veřejné manifesty aplikací,
- ukládá nastavení, anonymní materiály, koncept a pilotní události do místního profilu prohlížeče,
- umožňuje vše exportovat a lokální data vymazat,
- používá striktní CSP, neobsahuje API klíče a neposílá vlastní analytiku třetím stranám.

## Co nedělá

- nepřihlašuje uživatele,
- nevynucuje skutečná oprávnění,
- nemá školní databázi ani centrální zálohu,
- nesynchronizuje data mezi zařízeními,
- neukládá prompty nebo obsah materiálů do pilotních exportů.

## Sdílený origin a sdílené počítače

Všechny aplikace hostované pod stejným originem `daniel22-dev.github.io` sdílejí technickou hranici místního úložiště. Proto:

- učitel nesmí používat Studio v profilu prohlížeče určeném žákům nebo pro veřejné třídní hraní,
- na sdíleném počítači se použije oddělený učitelský profil, režim hosta nebo se po práci vymažou místní data,
- žákovské zařízení neslouží k přípravě materiálů ve Studiu,
- do pracovního prostoru patří pouze anonymní, veřejný nebo smyšlený obsah,
- `localStorage` není šifrovaný trezor.

## Handoff

Předávka je platná 30 minut a po převzetí se smaže. Funguje jen na stejném originu. Mezi různými doménami se používá ruční soubor `.ghrab.json`; po nasazení backendu se předávka nahradí serverovým API.

## Anonymní pilotní export

Export smí obsahovat pouze:

- typ aplikace a události,
- čas události,
- počet spuštění,
- výsledek operace,
- hodnocení užitečnosti,
- učitelem vykázané minuty,
- oddělený automatický orientační odhad.

Nesmí obsahovat jména, prompty, názvy materiálů, texty, studentské práce, volné poznámky ani identifikátory osob. Funkční regresní test používá syntetická „otrávená“ data a ověřuje skutečné exportní funkce.

## Pro pilot

Každý výstup AI kontroluje učitel. Do externí AI služby nepatří identifikovatelné zdravotní, kázeňské, rodinné ani jiné citlivé údaje. Studentské práce a školní korespondence se anonymizují ještě před vložením.

## Budoucí serverová verze

Před oficiálním provozem musí škola vyřešit přihlášení školní identitou, serverové vynucení proškolení, minimalizaci dat, dobu uchování, zálohování, auditní logy, správu tajemství, incidenty a odpovědnosti.
