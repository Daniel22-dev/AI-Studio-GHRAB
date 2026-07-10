# Pokročilá automatizace aktualizací

Studio funguje automaticky ve dvou vrstvách.

## Vrstva 1 — bez tokenu

Workflow AI Studia se spustí každou hodinu. Stáhne veřejné manifesty aplikací, ověří je a znovu nasadí portál. Tato vrstva nevyžaduje žádné tajné údaje.

## Vrstva 2 — okamžitá aktualizace

Po úspěšném nasazení Generátoru, LUDUSu nebo společného repozitáře školních aplikací se odešle událost `repository_dispatch` do AI Studia. To spustí synchronizaci během několika sekund.

### 1. Vytvoř jemně omezený token

Na GitHubu otevři:

`Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token`

Nastav:

- **Token name:** `AI Studio dispatch`
- **Repository access:** pouze repozitář `AI-Studio-GHRAB`
- **Repository permissions → Contents:** `Read and write`
- ostatní oprávnění ponech bez přístupu

Token po vytvoření zkopíruj. Později už se znovu nezobrazí.

### 2. Ulož token jako secret

Stejný postup proveď ve třech zdrojových repozitářích:

- `generator-testu`
- `Skolni-aplikace`
- `Ludus`

V každém:

`Settings → Secrets and variables → Actions → New repository secret`

Název musí být přesně:

`AI_STUDIO_DISPATCH_TOKEN`

Do hodnoty vlož vytvořený token.

### 3. Ověř funkci

1. V jednom zdrojovém repozitáři spusť jeho deploy workflow ručně.
2. Po úspěšném nasazení otevři Actions v `AI-Studio-GHRAB`.
3. Měl by se objevit nový běh vyvolaný událostí `repository_dispatch`.
4. Po dokončení otevři ve Studiu stránku **Automatizace**.

## Bezpečnost

- Token není v kódu ani v ZIPu.
- Token má přístup pouze k jednomu repozitáři.
- Zdrojové repozitáře mohou pouze vyvolat synchronizační událost.
- Pokud token odstraníš, zůstane funkční hodinová synchronizace.
- Token nikdy nevkládej do HTML, JavaScriptu, README ani manifestu.
