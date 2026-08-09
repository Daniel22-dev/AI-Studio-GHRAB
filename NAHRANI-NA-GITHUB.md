# Nahrání AI Studio GHRAB 0.20.20

> Aktuální verze: **0.20.20** · etapa P5

Tato opravná verze řeší CI regresi offline startu z 0.20.19: statické registry požadované s `cache: 'no-store'` používají network-first s cache fallbackem, zatímco runtime API, auth/session/health a deployment konfigurace zůstávají mimo service worker. Ostatní auditní opravy z 0.20.19 jsou zachovány. AI Studio se nadále nasazuje jako poslední, po všech samostatných aplikacích.

## Povinné pořadí

1. Korespondenční asistent 5.9.21
2. SORTIO 1.0.9
3. Lesson Hub 1.2.6
4. Diferenciátor 1.3.10
5. ACTIVA 0.5.7
6. Hodnotitel maturitních slohů 1.5.8
7. LUDUS 1.16.9
8. Generátor interaktivních testů 7.1.10