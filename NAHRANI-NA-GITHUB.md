# Nahrání AI Studio GHRAB 0.20.1

Tento balík zachovává samostatné repozitáře aplikací a přidává centrální správu GHRAB AI Core 1.0.0; živé verze aplikací zůstávají řízeny jejich manifesty.

> Verze 0.20.1 opravuje selhání GitHub Actions: release soubory v `src/ai-core/releases/` jsou neměnné, Prettier je ignoruje a SHA-256 se ověřuje před i po formátování.

## Postup

1. Otevřete repozitář `Daniel22-dev/AI-Studio-GHRAB`.
2. Nahrajte **obsah ZIPu přímo do kořene repozitáře** a potvrďte přepsání existujících souborů.
3. Zachovejte zejména složky `.github`, `src`, `scripts`, `qa` a soubory `package.json` a `package-lock.json`.
4. Složku `dist` nahrávat nemusíte; GitHub Actions ji sestaví znovu.
5. Po commitu se workflow spustí automaticky. Sledujte, zda projdou `qa-build`, `qa-diagnostics` a `deploy`.
6. Po zeleném nasazení zavřete všechny staré karty AI Studia a otevřete Studio znovu.

## Očekávaný výsledek

Studio zachová aktuální živé verze aplikací a ve Správě zobrazí Core 1.0.0, runtime direct-gemini a pravdivý stav migrace.

Správcovská stránka po nasazení zobrazí aktivní Core 1.0.0 a KS 5.9.1 jako certifikovaný před nasazením. Po publikování KS 5.9.1 a další synchronizaci se stav automaticky změní na nasazený.
