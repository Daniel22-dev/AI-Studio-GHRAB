# Aktualizace AI Studio GHRAB 0.21.7

Verze 0.21.7 uzavírá další kolo provozního auditu AI Studia. Nemění základní architekturu portálu ani model Materiálů; soustředí se na srozumitelnost, každodenní bezpečnost, zastupitelnost a dvě konkrétní chyby Prezentace.

## Co je nové

- Patička zůstává samostatným blokem, ale má vlastní modrý Studio gradient místo téměř černého pozadí.
- Rychlá kontrola dat má deset praktických školních kategorií. Při více volbách rozhoduje nejvyšší riziko a bezpečná anonymní volba je vzájemně výlučná s rizikovými položkami.
- Kontrola zdrojů rozlišuje tři úrovně důvěry: přímo ověřený nasazený manifest, ověřený veřejný GitHub zdroj a záložní snapshot bez aktuálního ověření. Offline QA už nesmí přepisovat poslední skutečný stav synchronizace.
- Synchronizace zdrojů běží souběžně. Pokud GitHub Pages manifest není dostupný, Studio ověří veřejný zdrojový repozitář, ale do runtime nadále používá poslední známý validovaný snapshot, dokud není nasazení potvrzeno přímo.
- Souhrnný report výslovně vysvětluje, že vlastní místní provozní data z aktuálního prohlížeče/profilu se přidávají automaticky přes přepínač „Zahrnout moje místní data do celku“; vlastní JSON se nahrávat nemusí.
- Povýšení existujícího proškoleného učitele na Zástupce správce zachovává jeho dosavadní výběr aplikací a samo mu neodemkne ostatní aplikace. Po ověření nového permitu lze starý učitelský JTI zneplatnit.
- Karty aplikací používají jednotný Studio-level popisek „Připraveno k řízenému pilotu“. Historické zdrojové formulace zůstávají dostupné v registru/diagnostice a nemění oprávnění.
- Fullscreen Prezentace počítá poloměr orbitu i podle výšky viewportu, takže horní a dolní aplikace nejsou odříznuté.
- Showcase video propouští HTTP Range požadavky mimo CacheStorage service workeru a má explicitní tlačítko „Přehrát film se zvukem“.

## Materiály

Příprava centrálního katalogu zůstává beze změny: bez školního serveru je úložiště lokální a sdílení komisím je pouze připravené. Integraci jednotného tlačítka „Uložit do AI Studia“ do jednotlivých osmi aplikací je vhodné provést až po dokončení auditu samotného Studia.

## GitHub a zastupitelnost

Role Zástupce správce ve Studiu sama o sobě nevyžaduje přístup ke zdrojovým repozitářům. Pokud má konkrétní osoba navíc technicky řešit Actions, deploy nebo rollback, používá vlastní GitHub účet s nejmenší potřebnou rolí k vybraným repozitářům. Přihlašovací údaje hlavního správce se nesdílejí.
