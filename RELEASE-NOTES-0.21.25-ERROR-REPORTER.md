# AI Studio GHRAB 0.21.25 — sjednocený reportér

- Centrální reportér zachovává novější kontrolu živého video frame a přebírá opravený dvoukrokový tok z KS 5.10.3.
- ZIP vznikne jako skutečný odkaz ke stažení. Gmail se zobrazí až po kliknutí na stažení a jasně vyžaduje ruční přiložení ZIPu.
- Pomocné video je vložené do kořene reportéru, mimo obrazovku, s `opacity: 0`, `visibility: hidden`, `pointer-events: none` a `aria-hidden="true"`.
- Browserový regresní test ověřuje skutečný soubor ve složce Stažené soubory, obsah ZIPu, Gmail koncept, motivy, mobilní zobrazení, klávesnici a jedinou instanci reportéru.
- Registr AI Studia ukazuje na nové verze všech změněných aplikací; KS zůstává na referenční verzi 5.10.3.
