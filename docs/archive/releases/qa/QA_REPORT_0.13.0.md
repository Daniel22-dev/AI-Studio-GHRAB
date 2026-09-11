# QA report – AI Studio GHRAB 0.13.0

## Rozsah kontroly

- samostatná grafická vrstva vnějšího, prostředního a vnitřního prstence,
- opačné směry otáčení, zastávky a finální zarovnání,
- sekvence sedmi světelných zámků,
- stavové fáze navolování,
- plný, lehký, vypnutý a systémově omezený režim pohybu,
- syntaktická kontrola JavaScriptu, úplný build a stávající bezpečnostní testy.

## Očekávaný výsledek

V plném režimu trvá sekvence 2,85 sekundy. Na konci jsou všechny obrazové vrstvy po celých otáčkách opět přesně zarovnané, takže po odebrání spouštěcí třídy nedojde k viditelnému poskočení grafiky.
