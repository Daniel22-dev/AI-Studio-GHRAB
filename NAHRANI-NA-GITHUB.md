# Nahrání AI Studio GHRAB 0.21.49

> Aktuální verze: **0.21.49** · etapa P5

> 0.21.49 zjednodušuje karty aplikací, přesouvá ovládací prvky do pravého horního rohu a připravuje centrální serverový provozní semafor; bezpečnostní logika GARP zůstává beze změny.

> **BLOKACE NASAZENÍ:** nový nezávislý GARP 2.3 cyklus byl výslovně zahájen. Verze 0.21.43 je kandidát po opravě D-01 / HIGH z první nezávislé kontroly tohoto nového cyklu a před nasazením musí projít jeho druhou Claude kontrolou a uzavřením release gate. Do té doby se tento postup NESMÍ použít k produkčnímu nasazení a reálná studentská data se nesmí použít.

Tato verze je opravný bezpečnostní kandidát nového výslovně zahájeného cyklu GARP 2.3 po opravě D-01 a zatím není schválena k nasazení. Zpevňuje ukončení práce na sdíleném zařízení, server-session scope, datové mazání a platformní telemetrii. Podepisovací klíče, existující revokace a vydaná oprávnění zůstávají beze změny; nasazení musí projít stejnými P5 a access gates jako předchozí release.

## Povinné pořadí

1. Korespondenční asistent 5.10.25
2. SORTIO 1.1.14
3. Lesson Hub 1.2.22
4. Diferenciátor 1.3.46
5. ACTIVA 0.5.22
6. Hodnotitel maturitních slohů 1.5.25
7. LUDUS 1.16.20
8. Generátor interaktivních testů 7.1.25