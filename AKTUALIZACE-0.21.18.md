# Aktualizace AI Studio GHRAB 0.21.18

Toto vydani stabilizuje Premium Master showroomu pro projekci v ucebne. Aplikacni rozhrani po nastupu zustavaji klidna, LUDUS pouziva stabilni hero zabery s kratkymi prolinackami a film si zachovava dynamiku bez prubezneho mikrotrepani.

Video zustava Full HD 1920x1080 / 30 fps. Hudba bezi plynule bez remixu. Zaverecna karta se zobrazi pouze jednou a prechod do finalni teze je primy a plynuly.

## CI hotfix

Prvni release candidate 0.21.18 narazil v GitHub Actions na vykonnostni limity P5 R2: vstupni kriticky payload byl tesne nad limitem a soubor showroom videa prekrocil limit pro lazy media. Opraveny kandidat zachovava stejny obsah i casovou osu videa, ale pouziva efektivnejsi H.264 kodovani z predchoziho stabilizovaneho masteru a lehce optimalizovany obraz portalu. P3 quality gate po oprave prochazi 176/176 kontrolami.
