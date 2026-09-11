# Komentář změn AI Studio GHRAB 0.5.1

Verze 0.5.1 reaguje na nezávislý hloubkový audit Claude Fable 5. Nejde o kosmetickou aktualizaci; jde o zpevnění před pilotem.

## Opraveno

1. **Statusy aplikací:** pilotní označení je nyní ve fallbacku i ve zdrojových manifestech. Buildy odmítnou manifest, který by před schválením školy znovu použil „produkční“ status.
2. **Zastaralé artefakty:** distribuční balík Školních aplikací byl vyčištěn od kořenových sestavených kopií 1.0.1/4.0.1.
3. **Zaplnění úložiště:** všechny klíčové zápisy jsou kontrolované. Uživatel už nedostane falešné potvrzení o uložení.
4. **Ztráta práce:** Pracovní tok automaticky ukládá koncept, obnoví jej po návratu a při neuložených změnách varuje před zavřením.
5. **Exportní test:** Kontrola Studia a CI používají skutečné exportní transformace s testovacími citlivými daty.
6. **Časové metriky:** učitelem vykázaná úspora je oddělena od automatického orientačního odhadu.
7. **Bridge:** adaptéry validují materiál, chrání zápisy, přenášejí návratovou adresu a nevkládají titul materiálu přes `innerHTML`.
8. **Dokumentace:** doplněn sdílený origin, bezpečné používání profilů, migrace handoffu, GitHub cron a kontinuita vlastnictví repozitářů.

## Vědomě ponecháno jako budoucí práce

- Skutečné oprávnění podle proškolení vyžaduje školní přihlášení a backend.
- Bridge zůstává implementován v jednotlivých aplikacích; smlouva je nyní sjednocena na 1.1, ale úplné sdílení jednoho souboru patří do další architektonické etapy.
- Mobilní kód je připraven, ale finální potvrzení musí vzniknout testem na skutečných zařízeních.
