# AI Studio GHRAB 0.14.3

## Oprava importu evidence

- Přístupový token má při importu absolutní přednost před obalovým `permitId`.
- Z ověřeného tokenu se sestaví kompletní evidenční záznam.
- Starý neúplný záznam se stejným JTI se přepíše.
- Po uložení se kontroluje interní ID, platnost a seznam aplikací.
- Uživatel vidí verzi importního modulu a detailní potvrzení načtených dat.
- Verze skriptů je součástí URL, aby prohlížeč nepoužil starou kopii.
