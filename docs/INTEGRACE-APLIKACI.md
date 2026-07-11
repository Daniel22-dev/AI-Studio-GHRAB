# Integrace samostatných aplikací — AI Studio 0.6.1

## Aktuální stav

Integrace je dokončena v Generátoru 7.0.6, Diferenciátoru 1.0.3, LUDUSu 1.14.3 a Korespondenčním asistentovi 4.0.3. Ochrana se nevztahuje jen na karty ve Studiu; probíhá také při přímém otevření každé aplikace.

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
- `ludus`
- `correspondence`

Identifikátor musí být shodný v manifestu, přístupové politice, oprávnění a bootstrapu.

## Zvláštní pravidlo LUDUSu

Dílna a přímo hostované enginy vyžadují oprávnění `ludus`. Při exportu hotové hry však LUDUS ochrannou vrstvu odstraní a obnoví běžné skripty. Výsledný HTML soubor je určen žákům a funguje bez účtu i offline.

## Společný formát a handoff

`ghrab-material-v1` obsahuje metadata, cíle, anonymní zdrojový obsah, strukturované úlohy a stav kvality. Krátkodobý `ghrab-handoff-v1` předává materiál mezi aplikacemi v rámci stejného originu. Přístupové oprávnění a výukový materiál jsou oddělené datové vrstvy.

## Povinné regresní scénáře

Pro každé vydání ověřit: přímou URL bez přístupu, správce, učitele s příslušnou aplikací, učitele s jinou aplikací, pozměněný podpis, expiraci, revokaci a nedostupnou centrální konfiguraci.
