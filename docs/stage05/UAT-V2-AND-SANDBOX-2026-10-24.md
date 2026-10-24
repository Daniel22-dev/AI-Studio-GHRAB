# Stage05 authorized UAT v2 / browser sandbox hardening
Date: 2026-10-24. **Release status: production HOLD.** Candidate baseline `e507d6402395ae1a11344ea366b23afd9b3d4f3c`, version `0.21.255`.

## Why this change is required

The authorized real-browser UAT test previously started visible Google Chrome with `--no-sandbox`, even when a legitimately authorized teacher entered school access on the consumer app. The script also wrote both v2 and legacy v1 handoffs (Studio production compatibility behavior): a successful import through the legacy fallback could be reported PASS although the intended Stage05 Bridge v2 was not working. Finally, the UAT script could capture screenshots of access gates, potentially including personal or school account details.

## Minimal corrective scope

- **Interactive sandbox enabled:** the teacher-facing persistent Chrome is launched with `chromiumSandbox:true` and **without `--no-sandbox`**. The original noninteractive CI browser retains its existing Linux-compatible invocation.
- **Protocol identity verified:** the test transport uses `writeLegacy:false`. For each of the six imports, it requires a correctly named v2 packet, no legacy handoff key, and a new `handoff-consumed` event with `contractVersion===2` and `sourceAppId==='ai-studio'`.
- **Evidence minimization:** remove ALL browser screenshots from this UAT, including the access gate. Record bounded error messages (not raw stack traces), booleans and synthetic material identifiers. The external Windows launcher only exports the redacted six-case summary.
- **New zero-dependency Node contract checks:** syntax, privacy, sandbox, v2-only consumption, six cases and no access bypass, executed in advisory `candidate` PR CI.
- **Runbook refreshed:** `docs/stage05/AUTHORIZED-UAT-RUNBOOK.md`.

These changes affect test harness and documentation **only**. They do not touch generator-testu, Differentiator, LUDUS sources, access policies, signatures, real data, backend configuration or the current Studio UI. There is no production deployment.

## Quality gate and remaining work

1. Review PR CI PASS with the new Stage05 UAT contract tests and existing 25 material-flow tests.
2. After preproduction merge, confirm full official P5 PASS on the **new exact** candidate SHA (old green runs are not transferable to new revisions).
3. Generate a new Windows UAT launcher pinned to the new candidate SHA. Do not silently reuse the old `e507d640` launcher.
4. A person with legitimate school app activation must run six real browser scenarios: Generator / Differentiator / LUDUS x desktop/mobile. All six must verify v2 consume and source UI fields, one-time handoff, TTL and privacy. Failure, `AUTHORIZATION_REQUIRED` or missing evidence is NO-GO.
5. Check actual Safari on an iPad/iPhone separately if required by school BYOD acceptance.
6. Preserve `candidate -> main` Draft PR #305 until release owner approves all conditions; only use established Safe Promotion with required GitHub branch protection. Do not bypass access controls or manually deploy from this review branch.

All UAT data is synthetic. The one-time FNV checksum is an integrity mechanism, **not authentication**. Signed school permits remain authoritative.
