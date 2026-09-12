# Nahrání AI Studio GHRAB 0.21.59

> Aktuální verze: **0.21.59** · etapa P5

> 0.21.59 zavádí řízené auto-patch promotion release wave pro GARP 2.5.1 zařazené aplikace; neověřené, minor/major a rollback změny zůstávají blokující.

> **PŘED NASAZENÍM:** aktuální release musí projít standardní P5/access gate v GitHub Actions. Pro produkční použití musí být zelené i povinné browserové kontroly CI; do uzavření těchto gate se nemají používat reálná studentská data.

Verze 0.21.59 navazuje na 0.21.56 a mění pouze build/release orchestration: přidává fail-closed auto-patch promotion pro GARP 2.5.1 zařazené aplikace. Uživatelský přístupový model, podpisové klíče, revokace ani runtime AI funkcionalita se nemění.

## Povinné pořadí

1. Korespondenční asistent 5.10.25
2. SORTIO 1.1.14
3. Lesson Hub 1.2.22
4. Diferenciátor 1.3.46
5. ACTIVA 0.5.22
6. Hodnotitel maturitních slohů 1.5.25
7. LUDUS 1.16.23
8. Generátor interaktivních testů 7.1.25