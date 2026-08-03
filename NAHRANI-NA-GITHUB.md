# Nahrání AI Studio GHRAB 0.20.3

Tato oprava nahrazuje pouze soubory změněné mezi verzemi 0.20.2 a 0.20.3. Živé verze aplikací zůstávají řízeny jejich manifesty.

> Důležité: repozitář před nahráním nemažte. ZIP se na GitHub nenahrává jako jeden soubor; nejprve jej rozbalte a nahrajte jeho rozbalený obsah.

## Bezpečný postup pro patchový balík

1. Otevřete repozitář `Daniel22-dev/AI-Studio-GHRAB` na větvi `main`.
2. Nic v repozitáři nemažte.
3. V počítači rozbalte balík `AI-Studio-GHRAB-0.20.3-PATCH-DO-KORENE.zip`.
4. Na GitHubu zvolte **Add file → Upload files**.
5. Přetáhněte rozbalený obsah patchového balíku. Cesty musí začínat přímo například `package.json`, `scripts/test.mjs`, `src/config/...`; nesmí vzniknout nadřazená složka s názvem balíku.
6. Před potvrzením commitu zkontrolujte, že GitHub ukazuje změnu `package.json` z `0.20.2` na `0.20.3` a změnu souboru `scripts/test.mjs`.
7. Commit potvrďte. Workflow se spustí automaticky.

## Kdy nahrání zrušit

Nahrání zrušte, pokud GitHub ukazuje smazání celého repozitáře, tisíce nově přidaných souborů, pouze nový ZIP nebo žádnou změnu v `package.json`. Správný patch mění přibližně dvacet souborů a nic hromadně nemaže.

## Očekávaný výsledek

Workflow poběží jako `ai-studio-ghrab@0.20.3`. Po živé synchronizaci zobrazí readiness report 1 nasazenou aplikaci, 0 certifikovaných před nasazením a 7 bez migrace. Projektový test už nebude obsahovat pevnou podmínku `KS 5.9.1`.
