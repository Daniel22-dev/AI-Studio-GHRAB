# AI Studio GHRAB 0.21.27 — hotfix produkčního screenshot QA

- GitHub QA ve verzi 0.21.26 skončilo po 87 úspěšných kontrolách na hlášce o produkční CSP. Zdrojová i sestavená CSP přitom už správně obsahovala `img-src ... blob:`.
- Reprodukce odhalila skutečnou příčinu: regresní test před produkčním screen-capture scénářem dvakrát otevřel novou Gmail kartu a původní kartu AI Studia už nevrátil do popředí. Chromium pak na pozadí výrazně throttlovalo nebo zmrazilo MediaStream a dekódování blob obrázku, takže test timeout mylně označil za CSP chybu.
- Test nyní před reálným canvas MediaStreamem volá `Page.bringToFront` a čeká na `document.visibilityState === "visible"`.
- Oprava byla lokálně reprodukována na stejném pořadí kroků: před změnou se běh zastavil přesně po kontrole samostatné instance reportéru, po změně prošel produkční screenshot s `screenshots: 1` a `imageReady: true`.
- Runtime reportéru, jeho workflow, limity screenshotů, ZIP, Gmail i bezpečnostní CSP se tímto hotfixem nemění.
