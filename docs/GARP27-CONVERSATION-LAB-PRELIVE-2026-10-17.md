# Conversation Lab GHRAB — GARP 2.7 r2/G-02 předběžná registrace

**Rozhodnutí:** REGISTERED_PRELIVE_POLICY_ONLY. **Není to povolení nasadit, spustit ani certifikovat aplikaci jako LIVE.**

## Rozsah této změny (17. 10. 2026)

- Zdrojová Conversation Lab zůstává **soukromá**: Daniel22-dev/conversation-lab-source, ověřený stav main 7f9d034595ee09343b71fe237195872ef2a22726.
- Zrcadlený bezpečnostní profil GARP 2.7 r2/G-02: security/garp27/apps/conversation-lab/garp-policy.json; důkaz shody s privátním zdrojem je Git blob SHA-1 uložené v conversation-lab-enrollment.json. Jde o **verzi profilu**, ne o autorizační token.
- Zrcadlený capability inventory: security/garp27/apps/conversation-lab/capability-inventory.json s vlastním kontrolním otiskem zdroje.
- **Normativní vendor balík se nemění.** Původní jedenáctičlenný seznam a historický SHA-256 manifest jsou zachovány. Studio používá podporovaný parametr validátoru "--inventory" pro lokálně důvěryhodné rozšíření security/garp27/ecosystem-apps.extended.json.
- Rozšíření přidává právě jeden appId conversation-lab do **předběžného inventáře pro policy validation**, nikoli do provozního registru aplikací Studia.
- scripts/garp27/conversation-lab-enrollment.mjs ověřuje pinned vendor Git blob, důvěryhodné rozšíření, identitu aplikace a politiky, zakázané provozní pravomoci, ukázkový veřejný/studentký versus učitelský vstup a nepřítomnost CLB v sedmi produkčních registrech. Spouští rovněž původní GARP 2.7 r2/G-02 validate-policy.mjs.
- Tato kontrola a negativní regresní testy jsou připojené do scripts/garp27/contract-gate.mjs. Oddělené read-only workflow garp27-conversation-lab-prelive.yml kontroluje feature branch i PR do candidate.

## Nefalšovatelné bezpečnostní hranice

Statusy jsou úmyslně následující:

| Oblast | Přiznaný stav |
|---|---|
| GARP policy admission | PRELIVE – strukturální a sémantická validace politiky |
| GARP 2.7 LIVE | NOT_TESTED |
| Ověření hostingu/originu | NOT_VERIFIED |
| Veřejný release | NO_GO |
| Veřejně vydaných lekcí | 0 |
| Lidsky schválených českých glos | 0 |
| Učitelská brána v AI Studiu | NOT_CONNECTED |
| Studio launcher | DISABLED |
| Auto Promotion | DISABLED |
| Cross-repository dispatch | DISABLED |

Veřejný přehrávač musí být anonymní, oddělený od originu AI Studia a mít přístup pouze ke schválenému veřejnému obsahu. Učitel používající aplikaci přes Studio musí projít školením/ověřením oprávnění **ve Studiu**, avšak nesmí získat práva studenta ani přenést Studio přihlašovací údaje do veřejného přehrávače.

Není doložena žádná provozní HTTPS/CSP kontrola, fyzický test Safari/iPad/Android, GARP live health ani vlastnictví budoucí domény. Za PASS lze označit jen přesný rozsah lokálního GARP policy checku.

## Proč nestačí připsat aplikaci do původního vendor inventáře

Referenční balík GARP 2.7 r2 má vlastní neměnný kontext a SHA256SUMS. Úprava MASTER/INVENTORY/ecosystem-apps.json by změnila referenční vstup bez řízeného rebaseliningu. Referenční README výslovně umožňuje samostatný důvěryhodný inventář předaný přes --inventory. Tuto cestu používáme pro přechodové období.

Důkaz skutečného živého nasazení a formální přechod z PRELIVE do ADMITTED vyžadují **nové samostatně schválené rozhodnutí**. Změna souboru registry nestačí.

## Další etapy (nejsou součástí tohoto PR)

1. Dokončit autorské/licenční a jazykové schválení vybraných lekcí a konkrétních českých glos. Dosavadní 6 pilotních variant má 0 dokončených lidských schválení.
2. Ověřit oddělený HTTPS origin a hlavičky na indexu, skriptech, CSS, katalogu a každé schválené lekci; zachovat žádné cookies, žádné externí překladové API, žádné veřejné přístupové klíče.
3. Zajistit produkční správu podpisových klíčů a nezávislý byte-parity audit schválené verze.
4. Doložit normativní GARP architecture-integrity, mutation/foundation i opravdové LIVE důkazy a bezpečnostní rozhodnutí vlastníka.
5. Teprve v samostatném E9 nasadit školením omezený launcher ve Studiu, aktualizovat sources, apps.generated, apps.fallback, release-wave, platform consumers a odpovídající topologii; bez přímého přidání do Auto Promotion.
6. Případné automatické PATCH aktualizace povolit až po ověřeném prvním živém vydání a release-integrity kontraktu a bez automatického schvalování nových lekcí.

## Změnová disciplína v AI Studiu

Studio vynucuje SAFE PROMOTION topology candidate -> main s P5 a GARP foundation. Tento návrh vzniká nejprve na samostatné feature větvi a PR má cíl candidate. **Nesmí se mergeovat přímo do main ani ručně spouštět deploy.** Před sloučením candidate je nutné vyřešit release-version a logbook policy; běžné změny adresáře security/ jsou ve Studiu považované za runtime delta.

Současný paket Studia má version 0.21.242, zatímco některé historické GARP profile metadata ukazují 0.21.117. Tento rozdíl zde nepřepisujeme; je třeba jej zvlášť posoudit v rámci release governance, ne prohlásit za aktuální certifikaci.

**Vydávací rozhodnutí:** NO-GO. **GARP LIVE:** NOT_TESTED. **Auto Promotion:** DISABLED.
