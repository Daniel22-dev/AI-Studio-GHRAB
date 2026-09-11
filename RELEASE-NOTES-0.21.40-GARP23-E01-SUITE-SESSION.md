# AI Studio GHRAB 0.21.40 — GARP 2.3 E-01 suite-session hardening

- Reakce na první nezávislou kontrolu nového auditního cyklu nad 0.21.39.
- Potvrzen E-01: ukončení práce ve Studiu dosud nevyvolávalo úklid dat v devíti child aplikacích na společném originu.
- GHRAB Platform 1.1.2 zavádí `ghrab-suite-session-v1`: trvalou neobsahovou generační značku, cross-context signál a API `session.end()` / `session.onEnd()` s replay pro aplikaci otevřenou až po ukončení relace.
- AI Studio při destruktivním `endWork` nově vždy vyšle suite-session signál; selhání signálu je fail-closed pro výsledek ukončení práce.
- Suite generation je sdílený platformní tombstone a Studio jej při `deleteMyData` nemaže.
- E-01 není tímto balíkem vydáván za uzavřený: všech devět child aplikací musí přejít na Platform 1.1.2 a napojit vlastní manifestovaný/app-specifický cleanup. Do dokončení release wave se sdílené zařízení s reálnými daty nepovoluje.
- Žádné reálné studentské údaje nebyly použity.
