# Moje skupiny v1

## Kontrakt
Centrální kanonický model používá schema `ghrab-teaching-group-v1` a service API `GHRAB_GROUPS`. Aktuální provider je local-first; UI a budoucí consumer aplikace nečtou raw storage klíč.

## Identity a revize
- `groupId` a `memberId` jsou stabilní náhodné identifikátory, nikoli hash jména nebo e-mailu.
- Každá kanonická změna zvyšuje `revision`.
- Zápis může používat `expectedRevision` a při stale stavu selže konfliktem.

## Storage
Namespace: `ghrab.ai-studio.groups.v1`. Provider validuje data před zápisem a po zápisu, podporuje JSON backup/restore a recovery z posledního validního stavu.

## Import z IS
Parser podporuje jména, školní e-maily, newline/tab/středník/čárku a tabulkové hlavičky včetně pořadí Příjmení/Jméno/E-mail. Před zápisem se zobrazí diff. Odebraný aktivní student se archivuje, aby se neztratila stabilní identita.

## Consumer projekce
- `sortio`: memberId + name
- `essay-evaluator`: memberId + name + schoolEmail
- `lesson-hub`: metadata skupiny bez členů
- `generator`: připraven metadata-only seam; Generátor se v této etapě nemění

Roster není součástí `ghrab-material-v1`.

## Security
Importní hodnoty se renderují přes textové DOM API, CSV export chrání formula injection, diagnostika/change events nenesou PII a import má velikostní limity. PII se nesmí zapisovat do telemetrie, URL ani crash diagnostiky.

## Budoucí server seam
Consumer/UI kontrakt zůstává stejný; LocalGroupsProvider lze později nahradit school-server providerem bez změny veřejného API.
