# AI Studio GHRAB 0.14.2

## Oprava importu existujících přístupů

Přístupový soubor `.ghrab-access.json` obsahuje jak podepsaný token, tak pomocný identifikátor `permitId`. Verze 0.14.1 při importu vyhodnotila `permitId` příliš brzy a soubor omylem zpracovala jako jednoduchý záznam evidence. Proto se zobrazilo pouze jméno a JTI, ale chybělo interní ID, aplikace a platnost.

Ve verzi 0.14.2 má podepsaný token vždy přednost. Studio ověří podpis a z tokenu načte všechny údaje. Opětovný import stejného souboru opraví existující neúplný záznam podle stejného JTI a nevytvoří duplicitu.
