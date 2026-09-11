# AI Studio GHRAB 0.21.38 – GARP 2.3 opravná reakce po druhé Claude kontrole

- Claude ve druhém kontrolním kole nezávisle potvrdil opravu všech nálezů B-01 až B-11 z prvního kola.
- C-02 HIGH: sdílené `endWork` nyní rotuje neobsahovou generační značku relace. Workflow ukládá generaci také do `history.state`, takže Back/bfcache/reload pozná, že stránka patří k ukončené relaci.
- Při návratu staré sdílené relace se zruší čekající autosave, formulář se vyčistí a autosave se zablokuje; tím je odstraněn i hybridní stav C-03.
- Při odchodu stránky do bfcache na sdíleném zařízení se obsah formuláře preventivně vyčistí z DOM; pokud relace ukončena nebyla, po návratu se koncept bezpečně obnoví z localStorage.
- C-01: úplné mazání a post-delete verifikace používají defaultní ownership pravidlo `ghrab.*`; namespace devíti registrovaných child aplikací jsou explicitní výjimky. Neznámý budoucí `ghrab.*` klíč AI Studia se proto sám považuje za vlastněný a smaže.
- Statická GARP kontrola storage povrchu nyní rekurzivně skenuje celý `src/**/*.js` a kontroluje shodu výjimek s `src/config/platform-consumers.json`.
- Do `qa:browser` byl přidán skutečný SIM-03 browser regression scénář pro shared-device Back/Restore a druhou kartu.
- Výkonnostní rozpočty ani bezpečnostní baseline nebyly uvolněny.
- Protože jde o distribuovanou změnu po druhé Claude kontrole, podle GARP 2.3 nelze tuto verzi bez nového výslovně zahájeného nezávislého cyklu prohlásit za Release Integrity GREEN.
- Do té doby: TESTOVACÍ PROVOZ POUZE SE SYNTETICKÝMI DATY; REÁLNÁ STUDENTSKÁ DATA: NEPOUŽÍVAT.
