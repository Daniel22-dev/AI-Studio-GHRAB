# Etapa 05 – skutečné oprávněné E2E a bezpečné vydání

Stav: NO-GO, dokud nebude prokázáno převzetí materiálu v odemčených cílových aplikacích.

## Zjištění 23. 10. 2026

GitHub Actions browser UAT otevřel publikované aplikace Generátor, Diferenciátor a LUDUS, ale všech šest kombinací desktop/mobil zobrazilo legální aktivační bránu „Tato aplikace je uzamčena – přístup zatím nebyl aktivován“. Proto nebylo možné vyzkoušet skutečný import. Nejedná se o důkaz chyby Bridge ani o úspěšný E2E test. Originální FAIL protokoly a screenshoty: workflow 40012064359, artefakt 12526269199.

## Podmínky vydání

1. Ověřit aktivní, oficiálně vydaný přístup oprávněného učitele do všech tří aplikací. Není dovoleno obcházet licenci ani aktivační mechanismy.
2. Syntetickým materiálem prokázat desktop + mobil pro Generátor, Diferenciátor a LUDUS, náplň formuláře/hry, tlačítko návratu, jednorázové převzetí, zamítnutí nekompatibilních dat.
3. Negativní scénáře: expirace, souběžný pending, zrušení, PII, HTML/XSS, velikost, chyba schématu. LUDUS vyžaduje pro typ mc4 čtyři volby.
4. Zapsat přesný SHA, datum, verze konzumentů, zařízení a redigované obrazovkové důkazy bez osobních údajů a přístupových tokenů.
5. Nejdříve musí projít advisory P5 preflight na review commitu, potom schválené UAT. Teprve potom se může PR sloučit do candidate; oficiální P5 a Safe Promotion jsou jedinou povolenou cestou do main.

Nesmí se vypínat access gate, vytvářet falešná oprávnění ani ukládat autentizační tokeny do CI artefaktů.