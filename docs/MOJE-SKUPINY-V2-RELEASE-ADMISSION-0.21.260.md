# MOJE SKUPINY v2 — čistý předprodukční návrh vydání 0.21.260

**UPOZORNĚNÍ: NEJDE O SOUHLAS S NASAZENÍM.** Tento soubor popisuje neprodukční sestavení určené ke kontrole.

## Přesné vstupní commity

- AI Studio PR #340: `6f9364787ec666de4771d1df55ce05b1f2056d5e` – verifikace účtu, úložiště v2, omezená aplikační rozhraní, kontrolovaný převod v1, ochrana odběrů změn.
- SORTIO PR #46: `bd4581265f72c51904754bd8299dd419c77717b6`.
- Hodnotitel maturitních slohů PR #53: `8211c730b4fd48e8af3e99c13b1d7ec1765ca485`.
- Lesson Hub PR #24: `f7355364c7604f7c16887a4b6d6a665bc7d9c475`.
- GIT: sjednocený Stage08 + ověřená čtečka v2 v PR #138 na `b6255c847931885fb5b57ccb795485920cee1132` (úplné izolované E10/P5 3/3 PASS); čistý návrh vydání PR #141 na `9ae2a93aef91c37cdfb23f36245d6bfa8717bdc2` (S83 na Linuxu i Windows 2/2 PASS, plná vydávací certifikace stále chybí). Historické samostatné PR #139 je překonané a nesmí být nasazováno.

Dřívější neprodukční testy těchto skutečných modulů: XR01–XR09, 9/9 PASS (Studio Actions #40657496005). Přístup byl v mezirepozitářovém testu simulovaný. Samostatné S01–S10 prověřily odmítání padělaného oprávnění skutečným ověřovacím modulem, nikoli skutečné školní SSO.

## Co obsahuje návrhová větev

- Pracovní verze `0.21.260` konzistentně povýšena podle `scripts/bump-patch-version.mjs`, mimo produkční větve.
- Doplněn česko-anglický release logbook `src/config/changelog.json`. Generovaný `CHANGELOG.md` se ručně neupravuje.
- Původní tři dočasné testovací workflow byly odebrány z návrhu vydání; historické důkazy zůstávají u původních SHA.
- V této navazující čisté větvi byla odstraněna poslední dočasná izolovaná CI `.github/workflows/groups-v2-release-admission-isolated.yml`. Úspěšný úplný GARP/P5 běh se vztahuje k původnímu návrhu PR #341 na `05ae47af29e3267cfa77b1061ece0d4c33116321`, **nikoli** automaticky k novému SHA. Konečný commit se musí nezávisle otestovat chráněnou cestou.
- Nezměněno: `candidate`, `main`, GitHub Pages, produkční GIT, reálná data žáků. Čistý návrh zůstává DRAFT / NO MERGE / NO DEPLOY.

## Zbývající povinné kroky – NO-GO

1. Nezávislá bezpečnostní kontrola konečných commitů AI Studia i čtyř konzumentů, včetně přísného režimu GIT a oddělení studentských exportů.
2. Prokazatelné oprávnění původního učitele převést historická data v1. Původní záznamy nemají spolehlivý atribut vlastníka; nedovozovat jej z názvu skupiny, e-mailu nebo přihlášeného prohlížeče. Neprovádět hromadný automatický převod ani smazání v1.
3. Ochrana osobních údajů: SHA-256 identifikátor v `localStorage` není šifrování a nechrání před jinými skripty stejné domény nebo přístupem k profilu. Pro sdílená zařízení musí škola schválit a vynucovat oddělené profily, případně serverovou autorizaci/izolaci.
4. Ověření skutečného školního přihlášení učitele, reálné Forms/Sheets pracovní cesty a testy Android Chrome, iPhone/iPad Safari včetně rozdělené obrazovky a Chrome/Edge na počítači.
5. Každá navazující aplikace musí projít vlastní kompletní certifikací konečného SHA včetně GARP/P5, chráněné cesty candidate→main, schválení správce a parity nasazených bajtů.
6. Výslovné schválení vydání AI Studio 0.21.260 a GIT 7.1.102. Starší souhlas se na nové vydání nepřenáší.
7. Odstranit poslední dočasné CI workflow a certifikovat výsledný commit. Bez vypínání testů, bezpečnostních pravidel, rozpočtů nebo podpisů.

## Obnova

Zachovat původní záznamy v1 a schválenou šifrovanou zálohu. Při ztrátě skupiny, změně memberId, neplatné revizi nebo úniku mezi učiteli pozastavit přechod. Neobnovovat skrytě staré neoddělené úložiště; řešit obnovu pouze s ověřeným vlastníkem a kontrolou všech konzumentů.
