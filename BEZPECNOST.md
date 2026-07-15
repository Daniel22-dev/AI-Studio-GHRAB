# Bezpečnostní hranice AI Studio GHRAB 0.16.7

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

Ochranný bootstrap je integrován v Generátoru 7.1.0, Diferenciátoru 1.2.0, Hodnotiteli maturitních slohů 1.4.0, LUDUSu 1.15.0 a Korespondenčním asistentovi 5.1.0. Běžný vstupní bod těchto aplikací nejprve načte centrální modul a ověří podpis, platnost, revokaci, roli, ID aplikace a aktuální verzi školení. Jde o praktickou ochranu proti běžnému sdílení přímé adresy, nikoli o serverovou ochranu zdrojového kódu: technicky zkušený uživatel může veřejný statický kód stáhnout nebo spustit mimo standardní bootstrap. Při nedostupnosti centrální konfigurace robustní bootstrap zobrazí srozumitelnou chybovou obrazovku a aplikaci nespustí.

## Klíče

Soukromý klíč je nejcitlivější soubor celého systému. Patří pouze správci, ideálně na šifrované zařízení a do oddělené offline zálohy. Nesmí být v GitHubu, e-mailu, veřejném cloudu ani společné školní složce. Veřejný klíč je určen k publikaci.

Veřejná konfigurace používá sadu klíčů. Při plánované rotaci se nejprve přidá nový veřejný klíč a označí jako aktivní pro vydávání; starý klíč zůstane po přechodnou dobu v sadě, aby již vydaná oprávnění nepřestala fungovat naráz. Po vypršení nebo nahrazení starých oprávnění lze starý klíč odstranit. Při kompromitaci se postupuje rychleji a podle potřeby se současně použije revokace podle data.

## Revokace

Konkrétní oprávnění se zneplatní přidáním jeho `jti` do `config/revoked-access.json`. Pole `revokedBefore` umožňuje zneplatnit všechna oprávnění vydaná před určeným okamžikem. Offline zařízení může dočasně používat naposledy uložený seznam; po připojení se načte aktuální verze.

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
