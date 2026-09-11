# AI Studio GHRAB 0.21.55 — adminské propojení s AI Akademií

Datum: 2026-09-11

## Změny

- Horní navigace Studia obsahuje novou záložku **AI Akademie**.
- Záložka používá existující full-admin viditelnost `data-admin-nav`; učitel ani role `operator` ji nevidí.
- Cílová URL Akademie je součástí deployment konfigurace: GitHub Pages `/AI-Akademie-GHRAB/`, školní profil `/apps/ai-akademie/`.
- Při přechodu se nepředává permit/token. Do Akademie se posílá pouze bezpečná návratová URL Studia.
- Verze byla zvýšena kvůli PWA cache, aby se nová navigace po nasazení nepletla se starým runtime.

## Bezpečnostní dopad

Žádná změna kryptografického modelu přístupů. Odkaz je pouze full-admin UI prvek a nepřenáší tajné údaje. AI Akademie provádí vlastní ověření admin role proti stávajícímu access runtime Studia před zobrazením návratu.
