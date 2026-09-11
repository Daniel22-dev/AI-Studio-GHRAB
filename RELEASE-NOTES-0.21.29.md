# AI Studio GHRAB 0.21.29 — bezpečnostní hardening

- Uzavřeny potvrzené nálezy Z1, Z2, Z3, Z5, technická část Z7 a Z10 z auditu Claude 0.21.28.
- Z4 je vynucen tvrdým klientským limitem 90 dní pro nová oprávnění a připravenou politikou pro příští podepsaný bundle; starší tokeny nejsou bez varování zneplatněny.
- Z6 vyžaduje budoucí oddělení aplikací na samostatné originy/subdomény a nelze jej bezpečně opravit uvnitř jednoho statického repozitáře.
- Z8 zůstává provozním rizikem GitHub schedule; workflow má ruční spuštění, ale externí připomínka nebo dohled musí být nastaven mimo repozitář.
- Z9 je záměrně odložen do chvíle, kdy bude známá školní doména a ověřeno HTTPS na všech jejích subdoménách.
- Nové regresní testy ověřují SW bypass, čerstvý podepsaný offline LKG a odmítnutí podvrženého času.
