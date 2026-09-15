# AI Studio GHRAB 0.21.71 – Performance Pack fáze B

## Rozsah

Fáze B optimalizuje rendering a škálování portálu bez redesignu, změny PWA cache nebo oslabení bezpečnostních a platformních kontraktů.

## Změny

- 30sekundový provozní polling už při stejné sadě stavů znovu nevytváří všechny karty aplikací. Porovnává pouze `connected`, stav Studia a stav jednotlivých aplikací; časová metadata se záměrně ignorují.
- Polling má pojistku proti překryvu dvou souběžných refreshů.
- Ikony aplikací mimo Top 4 používají nativní lazy loading.
- Karty v sekci Další aplikace používají `content-visibility: auto` a stabilní intrinsic size, takže obsah mimo viewport nemusí browser vykreslovat předem.
- Výběr Top 4 a úplnost katalogu jsou regresně ověřeny na syntetických registrech s 20, 30 a 50 aplikacemi.
- Duplicitní překreslení přehledu přístupu při změně jazyka bylo odstraněno.

## Neměněno

- Vzhled a rozložení portálu.
- FULL/LITE/OFF a adaptivní AUTO z fáze A.
- Access-control, GARP security, GHRAB Platform 1.1.2 a AI Core kontrakty.
- Service worker a PWA/cache strategie – ty patří až do další fáze.
- Stávající performance budgety nebyly zvýšeny.
