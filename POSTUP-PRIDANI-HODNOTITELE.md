# Postup přidání Hodnotitele do AI Studio GHRAB

## Doporučené pořadí

### 1. Aktualizovat repozitář Hodnotitele

1. Rozbalte `Hodnotitel-maturitnich-slohu-v1.3.1-AI-STUDIO-READY-GITHUB-ROOT.zip`.
2. V repozitáři `Hodnotitel-maturitnich-slohu` nahrajte veškerý obsah rozbalené složky do kořene.
3. Potvrďte nahrazení existujících souborů.
4. Vyčkejte, až v Actions zezelená `Test and deploy Hodnotitel`.
5. Ověřte přímou adresu aplikace. Bez platného přístupu má zobrazit zámek.

### 2. Aktualizovat repozitář AI Studia

1. Rozbalte `AI-Studio-GHRAB-v0.6.2-HODNOTITEL-GITHUB-ROOT.zip`.
2. V repozitáři `AI-Studio-GHRAB` nahrajte veškerý obsah do kořene včetně složky `.github`.
3. Potvrďte nahrazení existujících souborů.
4. V Actions vyčkejte na zelené kroky synchronizace, validace, buildu a deploye.
5. Otevřete AI Studio. Ve výchozím Top 4 má být Hodnotitel; LUDUS bude v sekci dalších aplikací.

### 3. Oprávnění

- Správcovský přístup s `apps: ["*"]` funguje i pro novou aplikaci bez změny.
- Přístup s ručně vyjmenovanými aplikacemi je nutné vydat znovu.
- Učiteli, který má používat Hodnotitel, vydejte nový přístup se zaškrtnutou položkou **Hodnotitel maturitních slohů** a školením `HOD-01`.

### 4. Kontrola

Ověřte tyto scénáře:

1. Anonymní okno + přímá URL Hodnotitele → zámek.
2. Přístup bez `essay-evaluator` → zámek.
3. Učitelský přístup s `essay-evaluator` → aplikace se spustí.
4. Správce s wildcard oprávněním → aplikace se spustí.
5. V AI Studiu se zobrazí pět aplikací a správná ikona Hodnotitele.
6. Stránka Kontrola Studia skončí bez chyby.

## Volitelná automatická synchronizace

Workflow Hodnotitele umí po nasazení upozornit AI Studio přes repository dispatch. K tomu je nutné v repozitáři Hodnotitele nastavit secret `AI_STUDIO_DISPATCH_TOKEN`. Bez něj integrace funguje také; AI Studio se synchronizuje při vlastním nasazení, ručním spuštění nebo hodinovém plánu.

## Bezpečnost

Na GitHub nikdy nenahrávejte soukromý podpisový klíč, uživatelské přístupové soubory, skutečné seznamy studentů ani studentské práce.
