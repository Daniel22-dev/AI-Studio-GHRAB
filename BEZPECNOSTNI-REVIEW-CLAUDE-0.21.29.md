# Nezávislé review bezpečnostního auditu Claude

> Historický stav verze 0.21.29. Následné ověření odhalilo problém časového modelu Z11, který opravuje verze 0.21.30; aktuální závěr je v `BEZPECNOSTNI-REVIEW-OVERENI-0.21.30.md`.

**Projekt:** AI Studio GHRAB 0.21.29  
**Podklad:** audit Claude pro 0.21.28 ze dne 21. 8. 2026  
**Metoda:** ověření každého tvrzení proti zdrojovému kódu, oprava potvrzených nálezů, statická QA, oba produkční buildy a cílené behaviorální regrese

## Celkový verdikt

Audit je kvalitní a jeho tři hlavní behaviorální nálezy jsou věcně důležité. Z1 a Z3 byly potvrzeny beze zbytku. U Z2 je správně popsán nepodepsaný klientský čas, ale navržená „nejvyšší verze v localStorage“ by nebyla spolehlivá ochrana: uživatel schopný měnit localStorage může změnit nebo odstranit i tuto pojistku. Oprava proto používá pouze kryptograficky podepsaný čas vydání bundle.

Po provedených změnách nezůstává v kódu žádný známý vysoký nález, který by šel smysluplně uzavřít uvnitř tohoto repozitáře. Zbývají architektonické a provozní podmínky vyžadující doménu, GitHub nastavení nebo externí dohled.

## Rozhodnutí po jednotlivých nálezech

| Nález | Verdikt | Provedené řešení | Zbytkové riziko |
| --- | --- | --- | --- |
| Z1 SW cache ruší offline limit | Potvrzen | Bundle i podpis jsou v `isRuntimeRequest()` a service worker je vůbec neobsluhuje. Přidán behaviorální regresní test. | Žádné známé v rámci navrženého LKG modelu. |
| Z2 nepodepsaný čas LKG | Potvrzen s korekcí opravy | Stáří se počítá z podepsaného `issuedAt`, se zpětnou kompatibilitou na podepsaný `generatedAt`. `fetchedAt` je pouze diagnostický údaj. | Klientská brána stále není bezpečnostní hranicí proti úpravě veřejného kódu. Lokální „monotonie verze“ nebyla přidána, protože by při stejném útočném modelu vytvářela falešný pocit ochrany. |
| Z3 povolující deployment fallback | Potvrzen | Běžný i školní produkční build obsahují zapečený profil. Neznámý profil má `authMode: disabled`, AI mód `disabled` a lokální klíče jsou povoleny jen explicitním `true`. Nejistý fallback klíč nepovolí, ale ani jej destruktivně nesmaže. | Školní server musí používat skutečný school-server build; QA to nyní kontroluje. |
| Z4 oprávnění až 400/1095 dní | Potvrzen | Od 22. 8. 2026 je pro nová oprávnění v ověřovači i vydavateli tvrdý limit 90 dní. Starší oprávnění zůstávají migračně platná do své expirace. Zdrojová politika je připravena na 90 dní. | Starší dlouhé tokeny je nutné podle potřeby individuálně revokovat. Nový podepsaný bundle musí vytvořit správce svým neveřejným klíčem. |
| Z5 XSS brána nehlídá tok dat | Potvrzen | Všech osm statických `innerHTML` bylo přepsáno na DOM API. Baseline je nula, takže jakýkoli nový evidovaný sink zastaví release. | Baseline nula neanalyzuje všechny možné DOM/data-flow chyby, ale odstraňuje popsanou slepou skvrnu pro sledované sinky. |
| Z6 společný origin | Potvrzen, architektonický | Bez lokální změny; přesun aplikací na oddělené subdomény je správné dlouhodobé řešení. | Jedno budoucí XSS na stejném originu může číst sdílená webová úložiště. Do té doby pod tento origin nepatří experimentální aplikace. |
| Z7 pohyblivé Actions + dispatch | Částečně potvrzen | Všechny použité Actions jsou připnuté na plné SHA; přidána měsíční kontrola Dependabotem. | Rozsah PAT, expirace, secret scanning a push protection jsou nastavení GitHubu. Počet povolených názvů dispatch událostí není skutečná autorizační hranice; kompromitovaný token může zvolit kterýkoli povolený název. |
| Z8 vypnutí cronu | Potvrzen, provozní | `workflow_dispatch` zůstává jako ruční obnova. | Samotný repozitář neumí spolehlivě hlídat deaktivaci vlastního cronu; je nutná externí připomínka nebo monitoring. |
| Z9 HSTS bez subdomén | Správně podmíněno | `includeSubDomains` ani `preload` nebyly naslepo zapnuty před existencí a kontrolou školní domény. | Doplnit až po ověření HTTPS na všech subdoménách. Předčasné zapnutí může odříznout legitimní HTTP subdoménu. |
| Z10 zavádějící název klíče | Potvrzen | Soubor i generátor používají `access-config-verify-key.json` a schéma `...verify-key-v1`; obsahuje pouze veřejný klíč. | Žádné známé. |

## Důležitá poznámka k aktuálnímu podepsanému bundle

Repozitář neobsahuje soukromý konfigurační podpisový klíč, což je správně. Proto nebylo možné bezpečně přepsat a znovu podepsat `access-config-bundle.json`. Současný bundle má podepsaný čas 4. 8. 2026 a po opravě Z2 je pro 24hodinový offline režim stale.

- Online provoz dál načte a kryptograficky ověří současný bundle.
- Offline provoz se správně uzamkne, dokud správce nevydá čerstvý bundle.
- Správce má na svém zařízení spustit `npm run access:sign` se soukromým klíčem mimo repozitář. Klíč se neposílá do chatu, e-mailu ani GitHubu.

## Kroky mimo kód

1. Před nasazením obnovit podepsaný access bundle lokálně.
2. V GitHubu ověřit fine-grained PAT pouze pro repozitář Studia, jeho expiraci a minimální oprávnění potřebné pro dispatch.
3. Zapnout secret scanning s push protection, ochranu větve `main` a povinné 2FA.
4. Nastavit externí prázdninovou připomínku na ruční spuštění workflow, pokud repozitář 60 dní nemá aktivitu.
5. Při skutečném školním serveru oddělit citlivé aplikace na samostatné originy a teprve po kontrole všech subdomén zvážit HSTS `includeSubDomains`/`preload`.

## Ověření změn

Lokálně prošly syntaktické a statické bezpečnostní kontroly, standardní i school-server build, 46 auditních regresí, 9 nových behaviorálních bezpečnostních regresí, 188 kontrol platformní shody a 176 kontrol kvality. XSS kontrola hlásí nula sledovaných sinků a CSP bez `unsafe-inline`.

Browserová a axe-core část release brány v předaném archivu lokálně spuštěna nebyla, protože archiv neobsahoval připnuté vývojové závislosti ani browser runtime. Tyto testy proto musí před nasazením úspěšně dokončit GitHub Actions, kde zůstávají blokující součástí release workflow.
