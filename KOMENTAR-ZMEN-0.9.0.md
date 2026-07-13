# AI Studio GHRAB 0.9.0 — aktivní čas a automatický pilotní report

## 1. Spuštění a aktivní čas v aplikacích

Spuštění se nyní zapíše až po skutečném načtení aplikace a úspěšném ověření přístupu. Nejde tedy jen o kliknutí na kartu ve Studiu. Započítá se také otevření z nainstalované ikony PWA nebo z přímé adresy, pokud má uživatel platné oprávnění. Jedno načtení stránky znamená jedno spuštění.

Měření běží v chráněných aplikacích až po ověření přístupu. Započítává pouze dobu, kdy je karta viditelná, okno prohlížeče je aktivní a uživatel v posledních pěti minutách provedl interakci. Skrytá karta nebo odchod do jiné aplikace měření okamžitě zastaví. Více karet stejné aplikace používá místní zámek, takže se čas nesčítá souběžně. Jeden interval může připsat nejvýše 20 sekund, což omezuje falešné navýšení po uspání počítače.

Nejde o docházkový systém ani přesné sledování práce. Je to konzervativní orientační metrika používání. Nezaznamenává pohyb myši, klávesy, prompty ani obsah.

## 2. Generování testů

Ochranný modul Generátoru sleduje pouze přechod jeho existujícího uživatelského rozhraní ze stavu generování do výsledku:

- hotový výsledek = úspěch,
- chybová obrazovka = chyba,
- návrat do klidového stavu = zrušený pokus.

Nezapočítávají se kontroly API klíče ani jiné pomocné požadavky. Do pilotních dat se ukládá jen čas, typ `generation`, ID aplikace `generator` a výsledek.

## 3. Ruční vykazování

Formulář pro ruční zadávání úspory času a užitečnosti byl odstraněn. Důvodem je nízká pravděpodobnost pravidelného vyplňování a riziko nepřesných údajů. Případové studie může správce doplnit pouze tehdy, když má konkrétní ověřenou zkušenost.

## 4. Měsíční připomenutí

Poslední kalendářní den měsíce se po otevření Studia zobrazí pouze běžnému učiteli s platným přístupem. Text výslovně říká, že nejde o povinnost, ale o osobní prosbu pro vyhodnocení vedením školy. Uživatel může souhrn stáhnout, otevřít návod, odložit upozornění o tři hodiny nebo je pro daný měsíc zavřít. Správci se dialog nezobrazuje.

## 5. Interaktivní manuál

Nový návod `manualy/pilot-report.html` vysvětluje volbu hlavního zařízení, měsíční připomenutí, stažení JSON, ruční přiložení ke školnímu e-mailu a postup při používání dvou zařízení.

## 6. Export a report

Export `ghrab-pilot-summary-v7-safe` obsahuje pouze souhrnné technické metriky. Report správce slučuje soubory z více zařízení a zobrazuje spuštění, aktivní čas, úspěšná a chybová generování, zrušené pokusy, materiály a bezpečné pracovní události.

## 7. Náhled pro správce

Ve Správě je karta **Náhled měsíční prosby**. Správce tak může kdykoli zkontrolovat text, vzhled, tlačítko stažení i odkaz na návod bez změny data počítače. Běžným učitelům se automatická verze nadále zobrazí pouze poslední kalendářní den měsíce.


## 8. Obnovení sdíleného modulu po nasazení

Dílčí aplikace používají společný ochranný modul uložený v AI Studiu. Některé nainstalované PWA mohou mít jeho starší kopii v místní cache. AI Studio 0.9.0 proto při prvním otevření nové verze projde cache stejného webového původu a odstraní jen staré kopie `app-guard.js` a `access-control.js`. Neodstraňuje pracovní materiály, přístupy ani jiná uživatelská data.

Po nasazení stačí nejprve otevřít nové AI Studio a potom všechny již otevřené dílčí aplikace jednou úplně zavřít a znovu otevřít. Noví uživatelé tento krok prakticky nepoznají, protože načtou aktuální modul hned při prvním spuštění.
