# AI Studio 0.21.135 — Moje skupiny

Implementována první etapa roadmapy: centrální local-first sekce „Moje skupiny“.

Hotovo:
- kanonický model `ghrab-teaching-group-v1`;
- stabilní náhodné groupId/memberId a revision contract;
- local-first provider se schema validací, recovery a backup/restore;
- import z IS s preview/diff, deduplikací a archivací odebraných členů;
- minimální consumer projekce pro SORTIO, Hodnotitel, Lesson Hub a budoucí GIT seam;
- UI pro aktivní/archivované skupiny, metadata a roster;
- ochrany XSS, CSV formula injection, stale revision, oversized import a PII leakage;
- GHRAB Platform 1.1.2 zachována; GARP 2.7 nebyl oslaben.

Lokální release validace před GitHub nasazením: groups suite PASS, Studio UX PASS, security regressions 19/19 PASS, GARP 2.7 static PASS a quality gate 206/206 PASS. Browser matrix nebyla v sandboxu označena jako PASS, protože chyběl Playwright runtime. GitHub CI slouží jako následná nezávislá validační brána.

GitHub consumer migrace SORTIO/Hodnotitel/Lesson Hub ani Generátor v této etapě nejsou součástí změny.
