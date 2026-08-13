# Integrace samostatných aplikací — aktuální registr

## Aktuální stav

Integrace je dokončena v Generátoru 7.1.13, Diferenciátoru 1.3.13, Hodnotiteli maturitních slohů 1.5.11, LUDUSu 1.16.12, Korespondenčním asistentovi 5.10.3, ACTIVA 0.5.10, SORTIO 1.0.12 a Lesson Hubu 1.2.9. Ochrana se nevztahuje jen na karty ve Studiu; probíhá také při přímém otevření každé aplikace.

## Jak funguje jednotné přihlášení

AI Studio i všechny aplikace běží pod originem `https://daniel22-dev.github.io`. Po aktivaci přístupu Studio uloží jediný podepsaný token do `localStorage` pod klíčem `ghrab.access.permit.v2`. Jednotlivé aplikace tento token pouze čtou a samy kryptograficky ověřují.

- role `admin` otevírá všechny aplikace,
- proškolený učitel otevře jen ID uvedená v poli `apps`,
- chybějící, expirovaný, pozměněný nebo zneplatněný přístup se odmítne,
- při nedostupnosti centrální konfigurace se aplikace neotevře.

## Povinné pořadí spuštění

Aplikační JavaScript je v distribučním HTML inertní. Bootstrap nejprve načte `/AI-Studio-GHRAB/access/app-guard.js`; až po úspěšném ověření obnoví původní typy skriptů. Přímou URL proto nelze obejít pouhým otevřením jiné cesty.

## Aplikační identifikátory

- `generator`
- `differentiator`
- `essay-evaluator`
- `ludus`
- `correspondence`
- `activity-builder`
- `sortio`
- `lesson-hub`

Identifikátor musí být shodný v manifestu, přístupové politice, oprávnění a bootstrapu.

## Zvláštní pravidlo LUDUSu

Dílna a přímo hostované enginy vyžadují oprávnění `ludus`. Při exportu hotové hry však LUDUS ochrannou vrstvu odstraní a obnoví běžné skripty. Výsledný HTML soubor je určen žákům a funguje bez účtu i offline.

## Společný formát a handoff

`ghrab-material-v1` obsahuje metadata, cíle, anonymní zdrojový obsah, strukturované úlohy a stav kvality. Krátkodobý `ghrab-handoff-v1` předává materiál mezi aplikacemi v rámci stejného originu. Přístupové oprávnění a výukový materiál jsou oddělené datové vrstvy.

## Povinné regresní scénáře

Pro každé vydání ověřit: přímou URL bez přístupu, správce, učitele s příslušnou aplikací, učitele s jinou aplikací, pozměněný podpis, expiraci, revokaci a nedostupnou centrální konfiguraci.

## Hodnotitel

Hodnotitel používá ID `essay-evaluator`, školení `HOD-01` a rizikovou úroveň `high`. Učitel potřebuje nový podepsaný přístup obsahující toto ID; staré přístupy se automaticky nerozšíří.

## Jediná instance technického reportéru

Samostatná aplikace volá `protectApp(appId, { errorReporter: false })` a následně načte jednu lokální synchronizovanou kopii reportéru. Tím je zachována samostatná a offline funkčnost bez souběhu s centrální instancí. Lokální manuál reportér nespouští a odkazuje na centrální návod AI Studia.
