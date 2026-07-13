# Nahrání AI Studio GHRAB 0.9.0

1. Rozbalte distribuční ZIP.
2. Nahrajte jeho obsah přímo do kořene repozitáře `AI-Studio-GHRAB`.
3. Nechte přepsat stávající soubory a potvrďte commit, například `AI Studio 0.9.0 active time and monthly reports`.
4. V GitHub Actions počkejte na zelené sestavení a nasazení.
5. Po nasazení nejprve otevřete AI Studio a proveďte `Ctrl + F5`. Nová verze jednorázově odstraní staré kopie sdíleného ochranného a měřicího modulu z PWA cache.
6. Všechny už otevřené nebo nainstalované dílčí aplikace úplně ukončete a jednou znovu otevřete přes AI Studio. Není nutné mazat pracovní data ani aplikace přeinstalovat.
7. Ve Správě otevřete **Náhled měsíční prosby** a potom **Kontrolu Studia**.
8. V Generátoru proveďte jeden úspěšný a jeden záměrně chybový pokus a ověřte, že se počty objevily v pilotním dashboardu a reportu.

Samostatné aplikace není kvůli této verzi nutné znovu nahrávat. Aktivní měření i rozpoznání výsledku Generátoru zajišťuje centrální ochranný modul AI Studia, který už aplikace používají. Jednorázové zavření a nové otevření je však nutné, protože aplikace, která byla otevřená ještě před aktualizací, má starý modul stále načtený v paměti.
