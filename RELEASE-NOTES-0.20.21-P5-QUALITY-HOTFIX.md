# AI Studio GHRAB 0.20.21 — P5 quality-report hotfix

Datum: 2026-08-09

## Důvod opravy

GitHub Actions ve verzi 0.20.20 úspěšně dokončil P3 quality gate (155/155 PASS), browserové testy včetně offline startu i další runtime kontroly. Finální P5 release gate však odmítl `dist/quality-report.json`, protože tento report neobsahoval pole `status`, přestože měl nulový počet selhání.

## Oprava

- `scripts/qa-p3-quality.mjs` zapisuje do `quality-report.json` explicitní `status: "passed"` nebo `status: "failed"`.
- `status`, `summary.passed` a `summary.failed` jsou odvozeny ze stejného seznamu neúspěšných kontrol.
- `scripts/test-audit-regressions.mjs` obsahuje regresní kontrolu, že P3 quality report status skutečně publikuje.
- Oprava offline startu ze 0.20.20 není měněna.

## Očekávaný výsledek

Pokud P3 quality gate skončí bez neúspěšných kontrol, `qa-p5-release.mjs` nyní přijme `quality-report.json` přes pravidlo `report.quality.accepted`.
