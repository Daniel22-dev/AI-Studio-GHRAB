# AI Studio GHRAB 0.21.30

## Oprava následného bezpečnostního ověření

- Offline dostupnost se počítá 24 hodin od posledního úspěšného online načtení, nikoli od podpisu konfigurace.
- Podepsaná konfigurace má samostatný maximální věk 30 dní.
- `bundle.version` musí odpovídat zapečenému `sharedAccessVersion`, což omezuje rollback staršího revokačního seznamu bez úpravy kódu.
- Build vypisuje skutečné stáří bundle; blokující CI kontrola ověřuje podpis, verzi i 30denní limit.
- Doplněn skutečný behaviorální test školního profilu, který nesmí povolit `direct-gemini` a musí zakázat lokální provider klíče.
- Podpisový nástroj odmítne soukromý klíč, který neodpovídá veřejnému trust anchoru zabudovanému v aplikaci.

## Pro správce

Příkaz `npm run access:sign` nyní vytvoří jedinečnou verzi bundle a současně aktualizuje `sharedAccessVersion` v aktivních deployment profilech. Bundle je nutné znovu podepsat po každé změně politiky či revokací a nejpozději jednou za 30 dní. Soukromý klíč zůstává výhradně mimo repozitář.
