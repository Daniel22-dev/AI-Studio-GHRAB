# Centrální provozní stav AI Studia a aplikací

Tento kontrakt je připraven pro školní serverový profil. V GitHub Pages profilu je funkce vypnutá a žádný provozní stav se neukládá lokálně.

## Aktivace

Serverový deployment musí mít současně:

- `features.schoolServerConnected = true`
- `features.centralOperationalStatus = true`
- `endpoints.operationalStatus = "operations/status"`

UI se zobrazí pouze správci. Stav musí být uložen centrálně na serveru a být společný pro všechny uživatele.

## GET `/api/v1/operations/status`

Vrací aktuální stav:

```json
{
  "schema": "ghrab-operational-status-v1",
  "updatedAt": "2026-09-11T08:00:00Z",
  "studio": {
    "status": "operational",
    "updatedAt": "2026-09-11T08:00:00Z"
  },
  "apps": {
    "generator": {
      "status": "maintenance",
      "updatedAt": "2026-09-11T08:00:00Z"
    }
  }
}
```

Povolené hodnoty jsou `operational`, `maintenance`, `outage`.

## PUT `/api/v1/operations/status`

Pouze administrátor. Tělo požadavku:

```json
{
  "schema": "ghrab-operational-status-update-v1",
  "targetId": "generator",
  "status": "maintenance"
}
```

Pro celé Studio se používá `targetId: "ai-studio"`. Server po zápisu vrátí kompletní snapshot ve formátu `ghrab-operational-status-v1`.

## Význam stavů

- `operational` — aplikace je dostupná standardně.
- `maintenance` — správce může aplikaci otevřít, ostatní uživatelé dostanou informaci o probíhající údržbě.
- `outage` — aplikace je označena jako mimo provoz a běžné spuštění je zablokováno.

## Důležitá serverová podmínka

Blokace nesmí stát pouze na JavaScriptu v AI Studiu. Server nebo reverse proxy musí provozní stav vynucovat také na cílové trase aplikace. Jinak by uživatel mohl omezení obejít přímým otevřením URL aplikace.

Pro `maintenance` server povolí cílovou aplikaci jen administrátorské relaci. Pro `outage` má server běžným uživatelům vracet servisní odpověď (typicky HTTP 503) a správci ponechat možnost stav změnit zpět v AI Studiu.
