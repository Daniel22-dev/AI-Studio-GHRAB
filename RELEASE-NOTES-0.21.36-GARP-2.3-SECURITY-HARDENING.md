# AI Studio GHRAB 0.21.36 — GARP 2.3 security hardening

Datum kandidáta: 2026-09-03

## Bezpečnost a soukromí

- Serverová relace učitele nyní vyžaduje explicitní seznam povolených aplikací; chybějící `apps` je fail-closed a neznamená `*`.
- `Ukončit práci` odstraňuje lokální podepsané oprávnění, invaliduje přístup v dalších otevřených kartách a u serverového profilu respektuje výsledek serverového logoutu.
- `Smazat moje data` a ukončení práce pokrývá oba transientní handoff klíče; nedostupný datový manifest už nemůže skončit falešným úspěchem.
- Platforma 1.1.1 neukládá `materialId` do pilotní telemetrie. AI Studio 0.21.36 vyžaduje platformu `>=1.1.1 <2.0.0`, aby rollback na starší zranitelnou platformu nebyl považován za kompatibilní.
- Diagnostika přístupové brány kopíruje pouze origin a pathname bez query/hash.
- Přístupová brána průběžně znovu ověřuje aktivní oprávnění při focus/pageshow/visibility, změně přístupu a podle expirace.
- Workflow neposílá `materialId` do pilotní telemetrie ani do URL cílové aplikace; starší lokální pilotní eventy se při startu sanitizují explicitním allowlistem.
- Handoff je fail-closed proti souběžnému přepsání: druhá předávka se odmítne, dokud první není spotřebována nebo neexpiruje.
- Platformní conformance kontrola odvozuje previous/current/next verzi z deklarované platformy; 1.1.1 tak prochází jako skutečný current a 1.1.0 je odmítnuta jako rollback.

## Provenance a rollback

Historické artefakty platformy 1.1.0 zůstávají beze změny jako provenance. Z bezpečnostních důvodů však nejsou pro AI Studio 0.21.36 podporovaným rollback cílem; minimální kompatibilní platforma je 1.1.1.

## Testovací režim

Bezpečnostní audit a regresní testy používají pouze syntetická data. Reálná studentská data nejsou součástí testů ani release artefaktů.
