# Aktualizace AI Studio GHRAB 0.21.6

Verze 0.21.6 zavádí provozní zastupitelnost hlavního správce bez nutnosti udělit druhé osobě trvale plná administrátorská práva.

## Zástupce správce

Nová role `operator` vidí Pohled kolegy, Správu, diagnostiku, Pilotní dashboard, souhrnný report a Evidenci přístupů. Nemá přístup k Vydavateli oprávnění, Prezentaci ani k operacím s podpisovými klíči a bezpečnostní politikou.

## Dočasný plný správce

Plný administrátor může nadále vydat samostatné oprávnění role `admin`, ale vydavatel při této volbě nabídne krátkou expiraci 7, 14 nebo 30 dní. Jde o mimořádný režim pro situace, kdy zástupce potřebuje provést zásah mimo svůj bezpečný provozní rozsah.

## Krizový manuál

Přibyl manuál `Manuály → Zástupce správce`, který popisuje triáž problémů, kontrolu manifestů a fallbacku, GitHub Actions, řešení přístupů, rollback a hranice, kdy musí být incident eskalován.

## Server

ROADMAP-SERVER nově počítá se zachováním role zástupce, auditovanými oprávněními a časově omezeným nouzovým povýšením po přechodu na školní server.

## Showcase film

Prezentace obsahuje vlastní dvouminutový Full HD film AI Studio GHRAB s originální industriálně-elektronickou hudební stopou, dynamickými kamerovými pohyby a přechody, profily všech osmi aplikací, materiálovým tokem, bezpečnostním semaforem, zastupitelností a vizí školního serveru. Film lze spustit samostatně nebo v nekonečné smyčce. Velký MP4 soubor není součástí offline PWA precache; při nedostupnosti média zůstává živý prezentační reel.
