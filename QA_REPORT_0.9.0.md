# QA report — AI Studio GHRAB 0.9.0

Datum kontroly: 13. 7. 2026

## Výsledek

**PASS — automatická validace a produkční sestavení proběhly bez chyby.**

## Ověřené oblasti

### Spuštění a aktivní čas

- spuštění se zapíše až po skutečném načtení chráněné aplikace a úspěšném ověření přístupu;
- otevření z AI Studia, přímé adresy i nainstalované ikony PWA se počítá stejným způsobem;
- jedno načtení stránky se zapíše nejvýše jednou;
- měření se spouští až po úspěšném ověření přístupu k aplikaci;
- započítává se pouze viditelná karta se zaměřeným oknem;
- po pěti minutách bez interakce se čas přestane připisovat;
- při přepnutí karty, minimalizaci nebo ztrátě zaměření se měření zastaví;
- jeden interval připíše nejvýše 20 sekund, takže uspání počítače nebo omezení časovače nemůže přidat dlouhé falešné období;
- místní zámek omezuje souběžné počítání stejné aplikace ve více kartách;
- čas se ukládá celkově i do kalendářních měsíčních přihrádek.

### Generátor testů

- ochranný modul sleduje existující stavy `genProgress`, `genResult` a `genError`;
- přechod z generování do hotového výsledku se zapíše jako `success`;
- přechod z generování do chybového stavu se zapíše jako `error`;
- návrat z generování do klidového stavu se zapíše jako `cancelled`;
- do události se ukládá pouze datum, typ, ID aplikace a výsledek;
- kontroly klíče a pomocné požadavky mimo hlavní generování se nezapočítávají.

### Měsíční export

- export používá schéma `ghrab-pilot-summary-v7-safe`;
- souhrn obsahuje jen aktuální kalendářní měsíc;
- náhodný měsíční identifikátor prohlížeče umožňuje aktualizovat opakovaný souhrn ze stejného zařízení a měsíce bez zdvojení;
- identifikátor se v novém měsíci změní a neobsahuje jméno ani e-mail;
- bezpečnostní self-test ověřil, že se neexportují prompty, názvy, texty, poznámky ani testovací obsah.

### Správcovský report

- import podporuje nové schéma i starší bezpečné souhrny;
- opakovaný souhrn stejného zařízení a měsíce nahradí starší verzi;
- souhrny z různých zařízení nebo měsíců se sčítají;
- datumové pole reportu filtruje měsíční importy, místní události, měsíční počty spuštění a aktivní čas;
- report zobrazuje spuštění, aktivní čas, úspěchy, chyby, zrušené pokusy a úspěšnost dokončených generování;
- export reportu používá schéma `ghrab-impact-report-v5-safe`.

### Připomenutí a manuál

- připomenutí se zobrazí pouze běžnému učiteli s platným přístupem a pouze poslední kalendářní den měsíce;
- správci se nezobrazuje;
- text výslovně uvádí, že odevzdání není povinnost, ale osobní prosba;
- dostupné je stažení, tříhodinové odložení, zavření pro daný měsíc a otevření návodu;
- interaktivní manuál obsahuje pět kroků a reálné tlačítko pro stažení souhrnu;
- manuál vysvětluje jedno hlavní zařízení i postup se dvěma zařízeními;
- soubory manuálu jsou součástí PWA cache.
- správce může upozornění kdykoli otevřít kartou Náhled měsíční prosby ve Správě, aniž by měnil systémové datum.

### Obnovení sdíleného modulu

- Studio při prvním otevření verze 0.9.0 vyhledá staré kopie `app-guard.js` a `access-control.js` v cache stejného webového původu;
- odstraní pouze tyto dva sdílené soubory, nikoli pracovní data, přístupy nebo jiné PWA assety;
- po jednorázovém zavření a novém otevření dílčí aplikace se načte aktuální měřicí modul;
- automatická kontrola ověřuje přítomnost této aktualizační pojistky ve zdrojovém i distribučním sestavení.

## Spuštěné kontroly

```bash
node scripts/test.mjs
```

Výstup:

```text
AI Studio GHRAB 0.9.0 built to dist/
Všechny kontroly AI Studio GHRAB prošly.
```

Dále byl samostatně ověřen měsíční export na testovacích datech: červencový souhrn zahrnul pouze červencová spuštění, aktivní čas a úspěšnou generaci a nepropustil vložený testovací prompt.

## Známé limity

- Aktivní čas je konzervativní odhad, nikoli přesná docházka. Při dlouhém čtení bez interakce se po pěti minutách zastaví.
- Pokud prohlížeč nebo operační systém stránku násilně ukončí, poslední nedokončený interval se nemusí uložit.
- Generování se počítá podle viditelného výsledného stavu aplikace. Neošetřená chyba, při níž by Generátor zůstal trvale ve stavu „generuji“, se nezapíše jako dokončená chyba.
- Připomenutí se může zobrazit jen tehdy, když uživatel poslední den měsíce AI Studio skutečně otevře.
- Bez serveru se data nepřenášejí automaticky a každý prohlížeč vede vlastní statistiku.
- Aplikace, která zůstala otevřená už před nasazením verze 0.9.0, začne nový modul používat až po jednorázovém zavření a novém otevření.
