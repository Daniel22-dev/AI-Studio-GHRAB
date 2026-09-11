# Bezpečnostní hranice AI Studio GHRAB 0.21.57

> Aktuální verze: **0.21.57** · etapa P5

> 0.21.57 přidává fail-closed auto-patch promotion pro jednou GARP 2.5.1 zařazené aplikace. Automatické přijetí vyžaduje živé deployment ověření a nesmí obejít Platform, repository ani ecosystem kontrakty.


## Rychlá kontrola dat v portálu

Záložka **Bezpečnost** obsahuje jednoduchý semafor a volitelnou pomůcku **Nejsem si jistý → rychle posoudit**. Uživatel do ní nevkládá dokument ani text; pouze označí typy údajů. Kontrola běží lokálně, nic neposílá a nepoužívá AI. Není povinná před každým použitím aplikace. Od 0.21.34 obsahuje deset praktických kategorií pro běžnou školní rutinu (identifikátory, práce žáka, známky/docházka, komunikace, obraz/hlas/rukopis, nepřímá identifikace, citlivé údaje, přístupové údaje a důvěrné interní dokumenty). Při více označených položkách vždy rozhoduje nejvyšší riziko: červená > oranžová > zelená; bezpečná anonymní volba se s rizikovými volbami nekombinuje.

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

### Release-wave promotion

Od 0.21.57 se běžný patch GARP 2.5.1 zařazené aplikace může přijmout automaticky pouze tehdy, když Studio ověří její skutečný živý deployment. Repository fallback a snapshot jsou pro auto-promotion nedostatečné. Výchozí režim všech nezařazených aplikací je manuální; rollback, prerelease, minor/major změna a drift repository/Platform/storage/cache kontraktů se blokují. `release-wave.json` se během QA nepřepisuje.


- spolehlivé ověření totožnosti osoby,
- zákaz předání platného přístupového souboru,
- centrální synchronizaci mezi zařízeními,
- okamžitý audit používání,
- bezpečnou centrální databázi,
- ochranu proti stažení veřejného statického kódu a jeho lokální úpravě technicky zkušeným uživatelem.

## Stav ochrany přímých adres

Ochranný bootstrap je integrován v Generátoru 7.1.25, Diferenciátoru 1.3.46, Hodnotiteli maturitních slohů 1.5.25, LUDUSu 1.16.23, Korespondenčním asistentovi 5.10.25, ACTIVA 0.5.22, SORTIO 1.1.14 a Lesson Hubu 1.2.22. Běžný vstupní bod těchto aplikací nejprve načte centrální modul a ověří podpis, platnost, revokaci, roli, ID aplikace a aktuální verzi školení. Jde o praktickou ochranu proti běžnému sdílení přímé adresy, nikoli o serverovou ochranu zdrojového kódu: technicky zkušený uživatel může veřejný statický kód stáhnout nebo spustit mimo standardní bootstrap. Při nedostupnosti centrální konfigurace robustní bootstrap zobrazí srozumitelnou chybovou obrazovku a aplikaci nespustí.

## Klíče

Systém používá dva oddělené podpisové účely. Klíč oprávnění podepisuje přístupy učitelů a správců. Konfigurační klíč podepisuje společnou bezpečnostní politiku a revokace. Rotace jednoho automaticky nerotuje druhý: v 0.21.31 se změnil pouze konfigurační klíč a v 0.21.32 přibylo jeho bezpečné místní použití v Centru zabezpečení. Verze 0.21.33 žádný klíč nemění; pouze nasazuje nově podepsaný seznam s jednou cílenou revokací.

Soukromé části obou klíčů jsou nejcitlivější soubory celého systému. Patří pouze správci, ideálně na šifrované zařízení a do oddělené offline zálohy. Nesmějí být v GitHubu, e-mailu, veřejném cloudu ani společné školní složce. Veřejné části jsou naopak určeny k publikaci v aplikaci.

Veřejná konfigurace používá sadu klíčů. Při plánované rotaci se nejprve přidá nový veřejný klíč a označí jako aktivní pro vydávání; starý klíč zůstane po přechodnou dobu v sadě, aby již vydaná oprávnění nepřestala fungovat naráz. Po vypršení nebo nahrazení starých oprávnění lze starý klíč odstranit. Při kompromitaci se postupuje rychleji a podle potřeby se současně použije revokace podle data.

## Revokace

Konkrétní oprávnění se zneplatní přidáním jeho `jti` do nového podepsaného access bundle. Správce nejprve označí JTI v Evidenci přístupů a poté v Centru zabezpečení místně vytvoří veřejný podepsaný aktualizační balíček. Pole `revokedBefore` umožňuje zneplatnit všechna oprávnění vydaná před určeným okamžikem, ale běžné rozhraní je záměrně nemění. Offline zařízení může poslední kryptograficky ověřenou konfiguraci použít nejvýše 24 hodin od posledního úspěšného online načtení; samotný podepsaný bundle nesmí být starší než 30 dní. Bundle zároveň musí odpovídat verzi zapečené v deployment profilu. Service worker bundle ani podpis neobsluhuje.

Vydání 0.21.43 zachovává právě jednu cílenou revokaci starého učitelského oprávnění z verze 0.21.33. Nejde o zneplatnění osoby ani všech jejích přístupů: nové oprávnění správce zástupce má samostatné JTI a zůstává platné.

Klientský `fetchedAt` měří pouze dobu od posledního spojení a sám není bezpečnostní kotvou. Rollback staršího revokačního seznamu omezuje podpis, 30denní stáří a shoda `bundle.version` se zapečeným `sharedAccessVersion`. Statický klient přesto není bezpečnostní hranice proti uživateli, který upraví samotný kód.

Nová přenosná oprávnění vydaná od 22. 8. 2026 mají tvrdý limit 90 dní. Starší oprávnění zůstávají migračně platná do vlastní expirace; při odchodu kolegy nebo ztrátě zařízení je proto nutná výslovná revokace. Tento mechanismus je praktická serverless ochrana, nikoli náhrada serverové identity a relace.

Po změně revokačního seznamu musí hlavní správce na svém zařízení znovu vytvořit podepsaný access bundle. Centrum zabezpečení vytvoří jedinečnou verzi, zkontroluje podpis a stáhne pouze veřejný aktualizační balíček. Ten se před nasazením nezávisle ověří a jeho verze se propíše do aktivních deployment profilů. I bez obsahové změny je nutné bundle nejpozději po 30 dnech obnovit; blokující CI kontrola starší verzi nenasadí. Soukromý konfigurační podpisový klíč se nikdy nevkládá do repozitáře ani neposílá jiné osobě.

## Deployment profil

Produkční build obsahuje zapečenou kopii deployment profilu. Lokální provider klíče jsou povoleny pouze při explicitním `allowLocalProviderKeys: true`; chybějící či neplatná konfigurace aplikaci ponechá v uzamčeném režimu. School-server build má zapečené `school-server`, `server-session` a `allowLocalProviderKeys: false`, takže výpadek samostatného JSON požadavku nemůže přepnout provoz na osobní Gemini klíč.

## Živá přítomnost na školním serveru

Živá přítomnost je připravená klientská schopnost, nikoli funkce současného GitHub Pages provozu. Aktivuje se jen při `server-session`, skutečném `schoolServerConnected=true` a explicitním `livePresence=true`. Viditelná a zaměřená karta pak posílá pouze `appId`. Jméno i rozhodný čas určí server z ověřené session; klient neposílá e-mail, IP adresu, zařízení, URL podstránky, prompty, materiály ani studentská data.

Server má stav držet pouze krátkodobě s doporučeným TTL 120 sekund a bez historie přechodů mezi aplikacemi. GET přehledu musí být povolen pouze plnému správci a POST heartbeat musí používat stejnou session/CSRF ochranu jako ostatní zapisovací endpointy. Přesný kontrakt je v `docs/LIVE-PRESENCE-SERVER-CONTRACT.md`.

## Sdílené počítače

Oprávnění i pracovní data jsou v profilu prohlížeče. Na sdíleném zařízení používejte oddělený učitelský profil nebo po práci odeberte přístup a vymažte místní data. Žákovský profil nesmí být používán k přípravě učitelských materiálů.

## Obsah a anonymizace

Do externí AI služby nepatří identifikovatelné zdravotní, rodinné, kázeňské ani jiné citlivé údaje. Studentské práce a korespondence se anonymizují před vložením. Každý výstup kontroluje učitel.

## Pilotní export

Povolené jsou pouze počty spuštění, orientační aktivní čas, pevně povolený technický typ výstupu, počet pokusů, úspěchů, chyb a zrušení, bezpečné typy pracovních událostí a souhrnné počty materiálů. Aktivní čas se započítává jen při viditelné kartě, zaměřeném okně a nedávné interakci; po pěti minutách nečinnosti se zastaví. Zakázány jsou prompty, testové otázky, odpovědi, texty a názvy materiálů, studentské práce, jména, e-maily, klávesové vstupy a volné poznámky.

## Hodnotitel maturitních slohů

Hodnotitel pracuje s potenciálně identifikovatelnými studentskými pracemi a e-mailovými adresami. Před odesláním do externího modelu se používá anonymizace; výsledky musí projít učitelským schválením. Reálné seznamy studentů, práce, exporty ani přístupové soubory nesmějí být součástí veřejného repozitáře.

## Hlášení technických chyb (0.11.0)

Jednotný nástroj hlášení chyb je načítán z centrálního `access/app-guard.js` pouze po úspěšném ověření přístupu k chráněné aplikaci. Manuály a nechráněné exportované studentské soubory jej nenačítají.

Nástroj neprovádí automatický screenshot ani nečte obsah aplikace. Snímek vznikne až po výslovném povolení snímání nebo ručním nahrání obrázku. Uživatel má před odesláním náhled každého snímku, může jej odstranit a může začernit citlivé údaje.

Automatické technické údaje jsou omezeny na název a verzi aplikace, čas, cestu stránky bez query parametrů a fragmentu, velikost okna a obrazovky, platformu, prohlížeč, online stav a počet snímků. Neobsahují identitu držitele oprávnění, prompty ani vygenerovaný obsah.

Bez serveru se hlášení neodesílá samo. Aplikace vytvoří jediný ZIP a otevře předvyplněný e-mail; uživatel přílohu vědomě přidá a odeslání potvrdí v e-mailovém klientu.

## GHRAB AI Core

Studio publikuje pouze veřejné artefakty Core, jejich SHA-256 a runtime bez tajných klíčů. `automaticFallback` je zakázán. Školní API klíč ani serverová autentizace nejsou v klientském balíku.

## API spotřeba bez zpřístupnění klíče

Od 0.21.54 je finanční přehled navržen jako server-only integrace. OpenAI administrátorský klíč nesmí být součástí HTML/JS, webového úložiště ani odpovědi prohlížeči. Klient přijímá jen agregované technické a finanční hodnoty přes same-origin serverovou session; odpověď se načítá s `no-store`. V bezserverovém režimu se endpoint nevolá a náklady se neodhadují.
