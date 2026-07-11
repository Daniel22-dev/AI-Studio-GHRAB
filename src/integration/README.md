# Ochrana samostatných aplikací bez serveru

AI Studio kontroluje podepsané oprávnění při spuštění karty. Aby nešlo ochranu obejít přímým odkazem, musí každá samostatná aplikace načíst ochranný bootstrap **před vlastním aplikačním kódem**.

## Doporučené zapojení

1. Do `<head>` cílové aplikace vložte styl z `app-guard-snippet.html`.
2. Původní vstupní modul aplikace nenačítejte přímo.
3. Vytvořte `access-bootstrap.js` podle příslušné šablony a v posledním řádku upravte cestu k původnímu vstupnímu modulu.
4. Ověřte přímou adresu bez oprávnění, s oprávněním pro jinou aplikaci a se správným oprávněním.

Veřejný ověřovací klíč je bezpečné publikovat. Soukromý podpisový klíč nesmí být v žádném veřejném repozitáři.

## Důležité omezení

Bezserverové oprávnění je praktická přechodová kontrola, nikoli náhrada školního přihlášení. Nelze jím bezpečně ověřit totožnost osoby ani zabránit předání platného souboru jinému kolegovi.
