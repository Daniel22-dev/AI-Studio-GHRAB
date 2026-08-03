# Aktualizace AI Studio GHRAB 0.18.8

## Důvod aktualizace

AI Studio správně otevíralo vzdálený manuál Korespondenčního asistenta, ale jeho lokální záložní registr a obsah karty manuálu stále odpovídaly starší verzi 5.2.5.

## Provedené změny

- registr `apps.generated.json` a fallback `apps.fallback.json` používají Korespondenčního asistenta 5.5.1,
- synchronizační report uvádí verzi 5.5.1,
- karta v Centru manuálů nově pokrývá pracovní profil, rychlé rozpoznání, školní scénáře, tón a délku, hromadné adresáty a finální kontrolu,
- dokumentace výslovně popisuje, že vlastní manuál se načítá z `manualUrl` aplikace a v AI Studiu se neduplikuje,
- AI Studio bylo povýšeno na verzi 0.18.8.

## Pořadí nasazení

1. Nejprve nasaďte Korespondenčního asistenta 5.5.1.
2. Potom nasaďte AI Studio GHRAB 0.18.8.
3. Po nasazení zavřete staré otevřené karty obou PWA a znovu je otevřete.
