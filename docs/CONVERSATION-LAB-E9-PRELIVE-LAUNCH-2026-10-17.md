# E9 PRELIVE – Conversation Lab jako izolovaný veřejný přehrávač + učitelská spouštěcí brána

**17. 10. 2026. Zdrojový návrh, nikoliv produkční nasazení.**

## Co je připravené v AI Studiu

- `src/integration/conversation-lab/launch-control.json` s výchozím `PRELIVE_HOLD`, `launchEnabled:false`, prázdným veřejným originem a nulovými schváleními.
- `src/integration/conversation-lab/teacher-launch.js` vynucuje pro učitelské spuštění oddělený HTTPS origin, přesnou cílovou URL bez query/hash, bez předání Studio přihlášení a vazbu na přesný manifest/release statement. Neověřené release flags **nestačí**: jejich hodnoty musí být doloženy nezávislou certifikací a autorizovaným releasem.
- `src/app/external/launcher.js` zachovává dosavadní `await initialiseAccess(); hasAppAccess(app.id)` (a tedy signed permit + školení). Pro `conversation-lab` přidává vlastní fail-closed host/release guard. Pro ostatní aplikace, zejména Maturita Desk, zůstává obvyklé spuštění beze změny.
- K registru `apps.generated.json`, `apps.fallback.json`, `apps.local.json`, `sources.json`, `access-policy.json`, `release-wave.json` ani k signed access bundle se **zatím nic nepřidává**, protože jejich aktivace by vytvořila neověřené oprávnění nebo nefunkční veřejný odkaz.
- Studio GARP PRELIVE PR #256 je samostatné a zůstává Draftem. Všechny vstupy normativního GARP 2.7 reference jsou beze změny.
- CI je výhradně read-only, bez Cloudflare upload tokenu, Pages write permissions, deployment jobu, public content exportu nebo cross-repo dispatch.

## Dvě oddělené cesty pro konečný provoz

### Učitel přes AI Studio

1. Učitel vstoupí do AI Studia a projde školením Conversation Lab (navržené `CLB-01`; verze školení před produkcí schválit).
2. Server/signed permit prokáže oprávnění učitele k `conversation-lab`. Bez něj žádné spuštění přes Studio.
3. Teprve samostatně potvrzený veřejný HTTPS origin se otevře **v horním okně**, ne v iframe.
4. **Žádný Studio permit, token, seznam skupin, jméno, e-mail studenta, klíč ani zpětná URL** se do veřejného přehrávače nepřenáší.

### Student přímo přes odkaz/QR

- Od začátku po schváleném veřejném vydání může student anonymně otevřít stejný **read-only přehrávač** bez AI Studia, účtu a školení.
- Dostupné jsou výhradně redakčně schválené lekce z přesně podepsaného katalogu. Soukromé varianty nejsou součástí serveru ani studentského offline cache.
- Bez externího překladového API. Dvojklik/kliknutí jen do schválených českých kontextových glos; nepokryté výrazy mají pravdivou hlášku.
- Prohlížeč nesmí z veřejné stránky získat přístup ke Studio přihlašovacím údajům.

## Povinné brány před první aktivací

1. Vybrat přesnou šestici autorizovaných pracovních variant, odborně schválit všech 222 glos, dvě změněné kotvy, autorství/licence a související finální SHA.
2. Vydat pouze schválenou verzi na **samostatném** školou ovládaném HTTPS originu (např. samostatný Cloudflare Pages Direct Upload projekt), s nezávislými owner/security podpisy a bez napojení Github commitů na automatický deploy.
3. Nezávisle změřit skutečné CSP `frame-ancestors 'none'`, HSTS, CORP, CORS, cache, bezpečnostní 404, přesné bajty všech assetů a chování Safari/iPad/Android/QR.
4. Doložit skutečné **GARP LIVE** (PRELIVE policy PASS není LIVE).
5. Samostatným PR doplnit školení `CLB-01` do přístupové politiky a **nově podepsaného access bundle**, s testy pro proškoleného učitele, neproškoleného učitele, správce a studenta.
6. Teprve potom přidat podepsaný produkční CLB manifest do Studio registru a exact origin, SHA a release identity do `launch-control`; provést P5 a výslovný owner GO. První vydání **manuálně**, nikdy automaticky s PR.
7. Auto Promotion i GARP cross-repo dispatch zůstanou vypnuté; případné PATCH-only updates se řeší v další schválené etapě.

## Co tato etapa prokazuje

- Existuje připravená skutečná **Studio runtime ochrana** pro budoucí učitelský launcher.
- Žádný student nemůže získat učitelská oprávnění přes veřejnou cestu a žádný učitel zatím nemůže otevřít neověřený CLB origin přes Studio.
- Žádná část této PR nedokazuje publikační práva, live hosting, schválení lekcí ani úspěšnou GARP LIVE certifikaci.

**Rozhodnutí:** GO pouze pro soukromý / prelive code review a testy. PUBLIC NO-GO, Studio launcher DISABLED, GARP LIVE NOT_TESTED, schváleno 0/6 a 0/222.
