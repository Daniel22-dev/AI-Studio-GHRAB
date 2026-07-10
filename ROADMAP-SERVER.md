# Přechod AI Studio GHRAB ze serverless pilotu na školní provoz

## Etapa A — řízený serverless pilot

- GitHub Pages a samostatné repozitáře,
- lokální demo proškolení,
- lokální pracovní prostor a autosave konceptu,
- ruční anonymní export pilotních dat od jednotlivých učitelů,
- přímý handoff na stejném originu a `.ghrab.json` mezi originy,
- vlastní API klíče uživatelů podle pravidel jednotlivých aplikací.

## Etapa B — školní server

- školní subdoména,
- přihlášení školním účtem,
- role a absolvovaná školení uložená na serveru,
- serverové vynucení přístupu také v aplikaci nebo API bráně,
- osobní pracovní prostor v databázi,
- serverové handoff API,
- bezpečná správa společných API klíčů,
- anonymní souhrnné statistiky za školu.

Při přesunu na jiný origin přestane lokální handoff fungovat. Migrace proto musí proběhnout současně se zavedením serverového API; do té doby zůstává oficiální náhradní cestou export/import `.ghrab.json`.

## Etapa C — plná školní platforma

- role učitel / komise / správce / vedení,
- schvalování a verzování materiálů,
- centrální katalog aplikací a Top 4 uživatele,
- auditní logy bez ukládání obsahu promptů,
- rozpočtové limity a monitoring spotřeby,
- zálohování a pravidelný test obnovy,
- testovací a produkční prostředí,
- řízené aktualizace a návrat na předchozí verzi.

## Otázky pro IT

1. Jaký backend je škola schopna dlouhodobě provozovat?
2. Lze použít Docker, Node.js nebo jinou podporovanou technologii?
3. Jaká databáze a zálohování jsou k dispozici?
4. Lze použít školní Google nebo Microsoft účty?
5. Kde budou uložena serverová tajemství a API klíče?
6. Kdo bude správcem, kdo nasazuje aktualizace a kdo řeší incidenty?
7. Jak se bude oddělovat testovací a ostré prostředí?
8. Může být služba dostupná z domova pod školní subdoménou?
9. Kdo bude vlastnit GitHub organizaci a repozitáře, aby projekt nebyl závislý na jediném osobním účtu?
10. Jak bude formálně evidováno absolvované proškolení a jeho případná expirace?

## Převod lokálních prvků na server

| Serverless pilot | Školní server |
|---|---|
| `ghrab.workspace.v1` | osobní pracovní prostor v databázi |
| `.ghrab.json` | verzovaný materiál |
| lokální handoff | serverové jednorázové API |
| demo proškolení | role a oprávnění z identity školy |
| ruční export učitele | anonymní centrální analytika |
| lokální report | souhrnný report pro vedení |
