# Integrace jednotlivých aplikací

## Fáze 1

Každá aplikace dostane v hlavičce nebo patičce jednotný odkaz:

```html
<a href="https://daniel22-dev.github.io/AI-Studio-GHRAB/" rel="home">
  Zpět do AI Studio GHRAB
</a>
```

Adresa se před nasazením upraví podle skutečného názvu repozitáře.

## Fáze 2

Diferenciátor začne exportovat `ghrab-material-v1`. Generátor tento balíček načte a převezme:

- název,
- předmět,
- ročník nebo cílovou skupinu,
- úroveň,
- výukové cíle,
- zdrojový text,
- diferencované varianty.

## Fáze 3

Generátor vytvoří herní balíček pro LUDUS. LUDUS před importem ověří, zda vybraný engine podporuje použité typy úloh.

## Zásada

Portál nesmí kopírovat kód aplikací do jednoho monolitu. Aplikace zůstávají samostatně nasaditelné a verzovatelné.
