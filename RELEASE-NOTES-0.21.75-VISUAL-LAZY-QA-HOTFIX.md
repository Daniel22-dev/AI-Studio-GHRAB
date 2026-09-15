# AI Studio GHRAB 0.21.75 — Visual lazy-image QA hotfix

Datum: 2026-09-15

## Důvod

GitHub release gate pro 0.21.74 úspěšně ověřil Platform 1.1.2 release-wave (`9/9`, `0` auto-patch promotion), ale vizuální QA označila záměrně odložené obrázky extra aplikací za „nenačtené“. Šlo o falešný pozitivní nález po Performance Phase B: extra karty používají `loading="lazy"` a jejich off-screen obrázky se správně nestahují, dokud nejsou potřeba.

## Oprava

- `qa-visual.mjs` čeká pouze na obrázky, které mají být v aktuálním viewportu skutečně načtené; off-screen lazy obrázky už test zbytečně neblokují.
- Za rozbitý se stále považuje každý dokončený obrázek s `naturalWidth === 0`, každý nedokončený eager obrázek a každý nedokončený lazy obrázek, který je právě ve viewportu.
- Produkční `loading="lazy"` z Performance Phase B se nemění.
- Statická regresní sada nadále kontroluje, že `app.icon` každé aplikace fyzicky existuje, takže hotfix neskrývá chybějící assety.
- Release-wave 0.21.74 zůstává beze změny: Generátor `7.1.28` je explicitní MANUAL baseline a promotion policy se nemění.

## Rozsah

Hotfix mění pouze diagnostiku vizuální QA a verzi Studia na `0.21.75`. Nemění runtime chování, bezpečnostní politiku, GARP, Platform kontrakt ani výkonové režimy FULL/LITE/OFF/AUTO.
