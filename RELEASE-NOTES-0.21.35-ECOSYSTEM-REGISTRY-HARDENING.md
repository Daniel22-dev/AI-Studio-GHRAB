# AI Studio GHRAB 0.21.35 — průřezové zpevnění registrů ekosystému

Verze 0.21.35 odstraňuje drift mezi živě synchronizovaným registrem aplikací, platformním registrem a AI readiness reportem. Nemění role, podpisové klíče, revokace, access policy ani pedagogické funkce.

## Změny

- `apps.generated.json` zůstává hlavním ověřeným registrem aplikací; GitHub deploy jej před buildem dál synchronizuje z manifestů jednotlivých repozitářů.
- `platform-consumers.json` už není ručně udržovaný nezávislý snapshot. Nový `sync-platform-consumers.mjs` jej deterministicky odvozuje z aktuálního registru aplikací a vlastního consumeru AI Studia.
- `ai-readiness.generated.json` se generuje až nad stejným synchronizovaným registrem, takže verze aplikace nemůže být v readiness jiná než v portálu.
- Nový blokující `qa:ecosystem` porovnává appId, verze, URL, platformní kontrakt, required range, platformVersion, cacheName, storagePrefix, Studio Bridge, artifact envelope, readiness a sharedAccessVersion.
- Brána kontroluje také unikátnost cache a storage namespace a ověřuje, že každá deklarovaná platformVersion splňuje vlastní required range.
- `qa:ecosystem` je součástí `npm test`, lokálního P5 i CI P5 release gate.
- Zdrojový fallback/snapshot byl dorovnán na aktuální verze aplikací známé z jejich GitHub `main`; při nasazení je i nadále přepsán živou ověřenou synchronizací.

## Bezpečnostní dopad

Změna zavírá průřezovou mezeru, kdy jeden release AI Studia mohl obsahovat aktuální `apps.generated.json`, ale starší `platform-consumers.json`. Nezavádí novou autentizační nebo autorizační logiku a nemění kryptografický trust anchor.
