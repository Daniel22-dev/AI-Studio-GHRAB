# Bezpečnostní hranice AI Studio GHRAB 0.6.1

## Co serverless portál zajišťuje

- ověřuje digitální podpis přístupového oprávnění,
- odemyká pouze povolené aplikace,
- odděluje správcovské stránky,
- kontroluje expiraci, publikum, klíč a revokační seznam,
- používá striktní CSP,
- neobsahuje API klíče ani soukromý podpisový klíč,
- ukládá pracovní data pouze místně,
- exportuje pouze omezené anonymní provozní údaje.

## Co bez serveru nezajišťuje

- spolehlivé ověření totožnosti osoby,
- zákaz předání platného přístupového souboru,
- centrální synchronizaci mezi zařízeními,
- okamžitý audit používání,
- bezpečnou centrální databázi,
- ochranu proti stažení veřejného statického kódu a jeho lokální úpravě technicky zkušeným uživatelem.

## Stav ochrany přímých adres

Ochranný bootstrap je integrován v Generátoru 7.0.6, Diferenciátoru 1.0.3, LUDUSu 1.14.3 a Korespondenčním asistentovi 4.0.3. Jejich aplikační skripty zůstávají inertní, dokud centrální modul neověří podpis, platnost, revokaci, roli a příslušné ID aplikace. Při nedostupnosti centrální konfigurace se aplikace bezpečně neotevře.

## Klíče

Soukromý klíč je nejcitlivější soubor celého systému. Patří pouze správci, ideálně na šifrované zařízení a do oddělené offline zálohy. Nesmí být v GitHubu, e-mailu, veřejném cloudu ani společné školní složce. Veřejný klíč je určen k publikaci.

Při kompromitaci soukromého klíče je nutné vytvořit nový pár klíčů, aktualizovat veřejný klíč a vydat nová oprávnění.

## Revokace

Konkrétní oprávnění se zneplatní přidáním jeho `jti` do `config/revoked-access.json`. Pole `revokedBefore` umožňuje zneplatnit všechna oprávnění vydaná před určeným okamžikem. Offline zařízení může dočasně používat naposledy uložený seznam; po připojení se načte aktuální verze.

## Sdílené počítače

Oprávnění i pracovní data jsou v profilu prohlížeče. Na sdíleném zařízení používejte oddělený učitelský profil nebo po práci odeberte přístup a vymažte místní data. Žákovský profil nesmí být používán k přípravě učitelských materiálů.

## Obsah a anonymizace

Do externí AI služby nepatří identifikovatelné zdravotní, rodinné, kázeňské ani jiné citlivé údaje. Studentské práce a korespondence se anonymizují před vložením. Každý výstup kontroluje učitel.

## Pilotní export

Povolené jsou pouze počty, typy událostí, čas, výsledek, hodnocení, učitelem vykázané minuty a oddělený orientační odhad. Zakázány jsou prompty, texty, názvy materiálů, studentské práce, jména a volné poznámky.
