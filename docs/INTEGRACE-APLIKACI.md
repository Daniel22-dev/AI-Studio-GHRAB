# Integrace aplikací — stav 0.3.0

## Princip

Aplikace zůstávají samostatně nasaditelné. Studio jim nepřebírá zdrojový kód; předává pouze standardizovaný anonymní materiál.

## Společný formát

Základním formátem je `ghrab-material-v1`. Obsahuje metadata, cíle, zdrojový obsah, strukturované úlohy a stav kvality.

## Přímá předávka

Studio vytvoří `ghrab-handoff-v1` v místním úložišti a otevře cílovou aplikaci s parametrem `?studioHandoff=1`. Protože všechny aktuální aplikace běží pod stejným původem `https://daniel22-dev.github.io`, mohou krátkodobou předávku bezpečně převzít ve stejném prohlížeči.

Při přesunu aplikací na různé domény nebude sdílený `localStorage` fungovat. Pak se použije souborový import nebo budoucí serverové API.

## Generátor testů 7.0.5

Přebírá název, předmět, skupinu, jazyk, CEFR, cíle, zdrojový text a strukturované úlohy. Importovaný obsah zůstává návrhem, který musí učitel zkontrolovat před generováním testu.

## Diferenciátor 1.0.2

Přebírá zdroj, cílovou skupinu, předmět a výukové cíle. Připraví zadání pro více variant se společným cílem a rozdílnou mírou podpory.

## LUDUS 1.14.2

Přebírá `ghrab-material-v1` nebo `LUDUS_CONTENT v2`. Podporované úlohy mapuje na herní stanice. Ruční import souboru funguje i tehdy, když přímý handoff není dostupný.

## Korespondenční asistent 4.0.2

Přebírá pouze anonymní pedagogický podklad a vytvoří komunikační brief. Automaticky nevytváří ani neodesílá individuální zprávy rodičům nebo žákům.

## Návrat do Studia

Po importu každá aplikace zobrazí banner s odkazem:

```text
Zpět do AI Studio GHRAB
```

## Pilotní události

Aplikace zaznamená pouze typ události, identifikátor aplikace, anonymní identifikátor materiálu a orientační úsporu času. Obsah materiálu ani osobní údaje se do pilotního logu nezapisují.
