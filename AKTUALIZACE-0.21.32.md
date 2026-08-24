# AI Studio GHRAB 0.21.32

## Praktický význam aktualizace

Hlavní správce nyní provede podpis zneplatnění přímo v AI Studiu. Soukromý klíč zůstane na jeho počítači a do dalšího pracovního vlákna se předává pouze veřejný aktualizační balíček.

| Oblast | Stav po aktualizaci |
| --- | --- |
| Příprava JTI | hlavní správce nebo zástupce v Evidenci přístupů |
| Podpis zneplatnění | pouze hlavní správce v Centru zabezpečení |
| Soukromý konfigurační klíč | jen v paměti prohlížeče, automaticky se vymaže |
| Soukromé klíče pro vydávání oprávnění | fungují dál, tato změna se jich netýká |
| Výstup pro kontrolu | jediný veřejný JSON bez soukromého materiálu |
| Účinnost zneplatnění | až po začlenění a nasazení nového podepsaného bundle |

## Nasazení

Nasazuje se celý build 0.21.32. Současný podepsaný bundle z verze 0.21.31 zůstává beze změny a dál se ověřuje stejným veřejným konfiguračním klíčem. Tím se nová stránka může bezpečně nasadit bez předání soukromého klíče.

## První použití

Po nasazení postupujte podle souboru `MANUAL-CENTRUM-ZABEZPECENI-AI-STUDIO-0.21.32.md`. Veřejný výstup z Centra zabezpečení se následně předá spolu s aktuálním zdrojákem k ověření a začlenění.
