# API spotřeba a náklady AI Studia

Tento kontrakt připravuje školní server pro správcovský přehled skutečné spotřeby OpenAI API. Klient AI Studia nikdy nedostává OpenAI API klíč ani OpenAI administrátorský klíč. Veškeré dotazy na OpenAI provádí výhradně školní backend a do prohlížeče vrací pouze agregované údaje.

## Aktivace

Serverový deployment musí mít současně:

- `authMode = "server-session"`
- `features.schoolServerConnected = true`
- `features.apiUsageReady = true`
- `features.apiUsage = true`
- `endpoints.apiUsage = "admin/api-usage"`

Dokud backend endpoint není hotový a ověřený, musí `features.apiUsage` zůstat `false`.

## GET `/api/v1/admin/api-usage`

Volitelné query parametry:

- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`

Server musí datum validovat, omezit maximální rozsah a používat vlastní autorizaci serverové session. Detailní stránka `API a spotřeba` je určena plnému správci. Agregovaný finanční souhrn může server povolit také roli, která smí generovat měsíční report.

Doporučená odpověď:

```json
{
  "schema": "ghrab-api-usage-v1",
  "generatedAt": "2026-09-11T12:30:00.000Z",
  "period": {
    "from": "2026-09-01",
    "to": "2026-09-11"
  },
  "currency": "usd",
  "budget": {
    "amount": 100,
    "period": "month"
  },
  "totals": {
    "cost": 18.42,
    "requests": 612,
    "inputTokens": 742100,
    "outputTokens": 188400,
    "cachedInputTokens": 205300
  },
  "projects": [
    {
      "projectId": "studio-apps",
      "label": "AI Studio a aplikace",
      "cost": 13.77,
      "requests": 548,
      "inputTokens": 654000,
      "outputTokens": 161000,
      "cachedInputTokens": 197000
    },
    {
      "projectId": "forge",
      "label": "Forge",
      "cost": 4.65,
      "requests": 64,
      "inputTokens": 88100,
      "outputTokens": 27400,
      "cachedInputTokens": 8300
    }
  ],
  "applications": [
    {
      "appId": "generator",
      "label": "Generátor testů",
      "cost": 5.24,
      "requests": 238,
      "inputTokens": 312000,
      "outputTokens": 72000,
      "cachedInputTokens": 91000
    }
  ],
  "models": [
    {
      "model": "example-model",
      "label": "Příklad modelu",
      "cost": 11.12,
      "requests": 390,
      "inputTokens": 510000,
      "outputTokens": 118000,
      "cachedInputTokens": 155000
    }
  ]
}
```

Pole `projects`, `applications` a `models` mohou být prázdná, pokud daný rozpad backend zatím neumí bezpečně určit. `totals.cost` je finančně rozhodující údaj pro zvolené období.

## Zdroj finančních dat

Pro skutečné finanční náklady má backend používat OpenAI Costs endpoint `GET /v1/organization/costs`. OpenAI Usage endpointy mohou doplnit počty požadavků a tokenů. Tyto OpenAI administrátorské endpointy vyžadují administrátorský klíč, který musí zůstat pouze jako serverový secret.

OpenAI finanční data lze seskupit podle projektu. Rozpad po jednotlivých aplikacích však OpenAI samo nemusí znát. Pro přesný aplikační rozpad proto školní AI gateway eviduje pouze technické čítače podle důvěryhodného `appId` a modelu. Nesmí ukládat prompt ani odpověď jen kvůli účtování.

## Bezpečnost a soukromí

Endpoint nesmí vracet:

- API klíče ani jejich celé identifikátory,
- OpenAI administrátorský klíč,
- prompty nebo modelové odpovědi,
- osobní údaje uživatelů,
- studentská data,
- e-mail, IP adresu nebo zařízení uživatele.

Server má vracet pouze agregované technické a finanční hodnoty. Odpověď musí mít `Cache-Control: no-store`. Endpoint musí být chráněn stejnou serverovou session, Origin/CSRF politikou a rate limitingem jako ostatní privilegované endpointy.

## Měsíční report

Stránka Report načítá stejný endpoint pro zvolené období. Když je serverová funkce aktivní, automaticky přidá OpenAI spotřebu do druhé strany dvoustránkového PDF. Když server ještě připojený není, PDF pravdivě zobrazí, že automatická API spotřeba čeká na server; nevytváří žádné odhadované náklady.
