# Jednotný kontrakt „Uložit do AI Studia“

Cíl: každá z osmi aplikací může používat stejné uživatelské tlačítko **Uložit do AI Studia**. Aplikace zůstává editorem; AI Studio je pracovní prostor, katalog a později serverový bod pro sdílení v předmětových komisích.

## Současný GitHub / serverless profil

1. Zdrojová aplikace vytvoří platný balíček `ghrab-material-v1`.
2. Zavolá helper `save-to-studio.js`, který vytvoří GHRAB Platform Bridge v2 handoff s cílem `ai-studio`.
3. Uživatel je přesměrován na `AI Studio / Materiály` s `?studioHandoff=1`.
4. Studio handoff jednorázově převezme, ověří schéma a uloží materiál do **Mých materiálů**.
5. Ruční `.ghrab.json` import/export zůstává záložní offline cesta.

Handoff je krátkodobý a spotřebuje se právě jednou. Nejde o serverové sdílení mezi kolegy; bez školního serveru zůstává materiál uložený v místním pracovním prostoru prohlížeče.

## Budoucí školní server

Stejné tlačítko a stejný materiálový kontrakt zůstanou zachované. Transport se může změnit na jednorázový serverový handoff a po uložení bude možné z Mých materiálů zvolit **Sdílet s komisí**. Server musí vynucovat oprávnění, verze, audit a zákaz publikace osobních údajů; nestačí pouze skrýt tlačítko v UI.

## Příklad

```js
import { saveMaterialToStudio } from "./save-to-studio.js";

saveMaterialToStudio({
  material,
  studioUrl: deployment.studioBaseUrl,
  sourceAppId: "generator",
  sourceAppVersion: APP_VERSION,
});
```

Tento soubor je integrační kontrakt Studia. Jeho přítomnost sama o sobě neznamená, že už bylo tlačítko fyzicky doplněno do všech osmi samostatných repozitářů aplikací.
