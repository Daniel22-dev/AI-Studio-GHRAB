# Živá přítomnost uživatelů AI Studia

Tento kontrakt připravuje školní server pro jednoduchý správcovský přehled **kdo je právě online a kterou aplikaci právě používá**. Nejde o docházku, sledování práce ani historii pohybu mezi aplikacemi.

V GitHub Pages profilu je funkce připravena, ale vypnutá. Klient v tomto režimu neposílá jméno, stav uživatele ani heartbeat.

## Aktivace

Serverový deployment musí mít současně:

- `authMode = "server-session"`
- `features.schoolServerConnected = true`
- `features.livePresenceReady = true`
- `features.livePresence = true`
- `endpoints.presence = "presence"`

Dokud není skutečný backend endpoint hotový a ověřený, musí `features.livePresence` zůstat `false`.

## POST `/api/v1/presence`

Každá chráněná aplikace používá centrální `app-guard` a `platform-runtime` AI Studia. Při aktivním serverovém profilu posílá viditelná a zaměřená karta heartbeat přibližně každých 45 sekund a okamžitě po získání focusu.

Tělo požadavku:

```json
{
  "schema": "ghrab-live-presence-heartbeat-v1",
  "appId": "generator"
}
```

Klient **neposílá jméno, e-mail, jiný identifikátor osoby ani klientský čas**. Server identitu odvodí výhradně z ověřené školní session a pro TTL použije vlastní čas přijetí požadavku.

Server musí:

1. vyžadovat platnou serverovou session a stejnou Origin/CSRF ochranu jako ostatní zapisovací endpointy,
2. ověřit `appId` proti známému registru a oprávněním aktuální session,
3. jako rozhodný čas pro TTL použít vlastní čas přijetí požadavku,
4. pro daného uživatele přepsat předchozí záznam novou aplikací a časem,
5. držet záznam pouze krátkodobě; doporučené TTL je 120 sekund,
6. neukládat historii přechodů mezi aplikacemi.

Doporučený minimální ephemeral záznam:

```text
userKey -> displayName, appId, lastSeenAt
```

`userKey` je interní identifikátor odvozený ze serverové identity. Nemusí a nemá se vracet do správcovského UI.

## GET `/api/v1/presence`

Pouze plný správce AI Studia. Server vrací pouze uživatele, jejichž poslední serverově potvrzený heartbeat ještě nepřekročil TTL.

```json
{
  "schema": "ghrab-live-presence-v1",
  "generatedAt": "2026-09-11T10:00:15.000Z",
  "staleAfterSeconds": 120,
  "users": [
    {
      "displayName": "Jana Nováková",
      "appId": "generator",
      "lastSeenAt": "2026-09-11T10:00:02.000Z"
    }
  ]
}
```

Správcovské UI zobrazuje pouze:

- jméno uživatele,
- právě používanou aplikaci.

E-mail, IP adresa, zařízení, URL podstránky, prompt, obsah materiálu, studentská data ani historie se do tohoto přehledu neposílají.

## Více otevřených karet

Klient heartbeat neposílá z běžné skryté karty. Po přepnutí focusu na jinou aplikaci se odešle nový heartbeat a server přepíše `appId` poslední aktivní aplikací. Správcovský přehled proto reprezentuje **naposledy aktivní aplikaci**, nikoli seznam všech otevřených karet.

## Retence a audit

Živá přítomnost má být ephemeral provozní stav, nikoli pracovní evidence. Záznam po vypršení TTL zanikne a nemá se přesouvat do databázové historie ani do měsíčního reportu. Standardní serverové bezpečnostní logy mohou evidovat technický HTTP požadavek, ale nesmí z těla heartbeat vytvářet uživatelskou historii používání aplikací.
