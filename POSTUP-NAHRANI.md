# Přesný postup nahrání AI Studio GHRAB 0.21.55 na GitHub – až po schválení

> Aktuální verze: **0.21.55** · etapa P5

> 0.21.55 přidává adminské obousměrné propojení s AI Akademií. Záložku ve Studiu vidí pouze plný správce; přístupový token se mezi aplikacemi nepřenáší.

> **PŘED NASAZENÍM:** aktuální release musí projít standardní P5/access gate v GitHub Actions. Pro produkční použití musí být zelené i povinné browserové kontroly CI; do uzavření těchto gate se nemají používat reálná studentská data.

## Předpoklady

Nejprve musí být nasazeny KS 5.10.25, SORTIO 1.1.14, Lesson Hub 1.2.22, Diferenciátor 1.3.46, ACTIVA 0.5.22, Hodnotitel 1.5.25, LUDUS 1.16.23 a Generátor 7.1.25. Jejich lokální reportér vypíná centrální instanci přes `errorReporter: false`.

## Nahrání

1. Stáhněte a rozbalte `AI-Studio-GHRAB-0.21.55-AI-AKADEMIE.zip`.
2. Do kořene repozitáře `AI-Studio-GHRAB` nahrajte přímo všechny soubory a složky z rozbaleného archivu.
3. Commit pojmenujte například `AI Studio 0.21.55 – propojení s AI Akademií`.
4. Vyčkejte na dokončení GitHub Actions. Workflow instaluje závislosti, synchronizuje manifesty, spustí regresi reportéru, celý GHRAB QA release gate, sestaví `dist` a až poté nasadí GitHub Pages.

## Kontrola po nasazení

- `dist/build-info.json`, PWA manifest a service worker musí uvádět 0.21.55.
- `dist/config/access-config-bundle.json` musí uvádět `access-p1-20260824175535Z-k_wtm7Zj`.
- Staré učitelské oprávnění kolegyně musí být po online obnovení odmítnuto a v Evidenci přístupů označeno jako centrálně zneplatněné.
- Nové oprávnění správce zástupce musí zůstat funkční; má jiné JTI a podpisový klíč oprávnění se v tomto vydání nemění.
- Ve **Správa → Centrum zabezpečení** musí hlavní správce vidět platný podpis konfigurace a počet připravených zneplatnění.
- Zástupce správce nesmí Centrum zabezpečení vidět ani otevřít; v Evidenci přístupů smí pouze připravit JTI.
- Soukromý konfigurační klíč se smí načíst pouze místně. Po podpisu se musí vymazat z paměti a výsledný veřejný JSON nesmí obsahovat vlastnost `d`.
- Registr musí uvádět všech osm aktuálních verzí aplikací.
- Ve správcovském pohledu musí mít každá karta symbol stavu testování `○`, `◐` nebo `✓`; po obnovení stránky musí zvolený stav zůstat zachovaný.
- V Pohledu kolegy ani běžnému učiteli se symbol stavu testování nesmí zobrazit.
- V každé aplikaci musí být právě jedno tlačítko **Nahlásit chybu**.
- Hlavní akce musí znít **Stáhnout ZIP a otevřít Gmail** a před kliknutím obsahovat příjemce `balaz@ghrabuvka.cz`.
- Ověřte systémový picker snímání, pořízení snímku přímo v dialogu i z plovoucího panelu, otevření nové karty Gmailu a ruční přiložení ZIPu.
