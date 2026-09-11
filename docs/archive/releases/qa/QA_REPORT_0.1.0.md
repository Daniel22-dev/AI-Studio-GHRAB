# QA report 0.1.0

## Kontrolované vstupy

- Generátor interaktivních testů 7.0.1,
- Diferenciátor 1.0.0,
- LUDUS 1.14.0,
- Korespondenční asistent 4.0.0.

## Výsledek automatických kontrol

`npm test` úspěšně ověřuje:

- platnost konfiguračních JSON souborů,
- čtyři unikátní aplikace a jejich verze,
- existenci ikon a ukázkových materiálů,
- základní strukturu výměnného formátu,
- syntaxi JavaScriptu,
- duplicitní HTML identifikátory,
- nepřítomnost externích skriptů a stylů,
- nepřítomnost známých formátů API klíčů a privátních klíčů,
- úplnost produkčního buildu,
- nahrazení verzovacích tokenů.

## Runtime kontrola

Lokální prohlížečový test ověřil:

- načtení čtyř aplikačních karet,
- aktivaci všech pěti kroků dema,
- funkční bezpečnostní posouzení,
- načtení čtyř položek knihovny,
- vytvoření čtyř pilotních statistik,
- bez zachycených JavaScriptových výjimek.

## Vizuální kontrola

Zkontrolováno:

- desktopové rozložení 1440 px,
- mobilní rozložení 390 px,
- čitelnost navigace, karet, workflow a patičky,
- stav stránek Demo, Bezpečnost a Knihovna.

## Známé hranice

- Odkaz LUDUSu je nastaven na `https://daniel22-dev.github.io/Ludus/`; skutečnou adresu je nutné potvrdit po nasazení.
- Portál zatím nepřenáší obsah přímo mezi aplikacemi.
- Knihovna je pouze pro čtení a spravuje se změnou repozitáře.
- Pilotní přehled eviduje pouze spuštění z portálu, nikoli dokončené materiály.
- Neproběhl smoke test na veřejné GitHub Pages adrese, protože repozitář ještě nebyl nasazen.
