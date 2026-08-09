# AI Studio GHRAB 0.20.9 — správa GHRAB AI Core

AI Studio je zdrojem pravdy pro vydaný GHRAB AI Core, runtime politiku a stav migrace aplikací. Nemění poskytovatele samo a neposílá AI požadavky.

## Současný stav

- aktivní Core: 1.0.0;
- runtime: `direct-gemini`;
- povolený režim: pouze `direct-gemini`;
- automatický fallback: zakázaný;
- School Gateway: připravená smlouva, nikoli aktivní služba;
- KS 5.9.3: živě nasazená a znovu certifikovaná referenční integrace; auditní důkaz je uložen v `docs/evidence/KS-5.9.3-overeni.txt`.

## Pravdivé stavy

`ready` vznikne pouze z živého manifestu aplikace s blokem `aiCore`. Lokální certifikace je vedena jako `certified-pending-deployment` nebo `certified-pending-manifest`. Studio nikdy neodvozuje připravenost jen z názvu ZIPu nebo ručního tvrzení.

## Distribuce

Core release v `src/ai-core/releases/1.0.0/` je neměnný. `verify-ai-core.mjs` kontroluje manifest a SHA-256. `distribute-ai-core.yml` je ve výchozím stavu dry-run a ostrý dispatch vyžaduje tajný `GHRAB_CORE_SYNC_TOKEN`.

## Podpis přístupového svazku

Správcovský nástroj `scripts/sign-access-bundle.mjs` je záměrně ponechán mimo běžný build. Spouští se explicitně příkazem `npm run access:sign`; nejde o automatickou release bránu.
