# Stage 05 test and security report

Date: 2026-10-23. Offline candidate base 0.21.241. Intended integration base: current GitHub main 0.21.253 or newer.

## Measured tests

| Command/check | Result |
|---|---|
| `npm run test:material-flow` | PASS 19/19, Node automated (includes real Platform Bridge v2 protocol) |
| `node scripts/test.mjs` | PASS, main Studio core regression tests |
| `node scripts/test-studio-ux.mjs` | PASS after updating outdated hardcoded expectations |
| `node scripts/test-security-regressions.mjs` | PASS 19/19 |
| `node scripts/test-garp-security-regressions.mjs` | PASS 19/19 (synthetic data only) |
| `node scripts/qa-p5-xss-sinks.mjs` | PASS, no forbidden HTML sink in inventory |
| `node scripts/ghrab-platform-conformance.mjs` | PASS |
| `npm run build` (postbuild conformance included) | PASS on archived 0.21.241 baseline |
| `node scripts/format-check.mjs` | PASS (hermetic project formatter; Prettier unavailable in environment) |
| isolated Playwright component layout at desktop and mobile viewports | PASS visual screenshots; **not** a full live-app E2E |
| `python tests/stage05/manifest-conformance.py <published-registry>` | PASS 10/10 current published app manifests; 9/9 archived; valid and invalid policy fixtures exercised |
| Stage 05 destination resolver with actual GitHub Pages 0.21.253 distributed app registry | PASS 3/3 reviewed consumers; other 7 not offered |
| `node scripts/qa-ecosystem.mjs` | FAIL: version/cache-name/manual URL drift already reproduced on **unchanged archived base** |
| Browser page navigation to local HTTP/GitHub Pages in this execution environment | BLOCKED by administrator, `net::ERR_BLOCKED_BY_ADMINISTRATOR` |

## Covered new scenarios

Canonical workspace merge, older/newer version precedence, private draft retention, dual-key rollback on storage failure, corrupted key behavior, anonymous vs PII vs malformed vs huge input, registry/schema restrictions, independent path allowlist and foreign-origin rejection, per-target requirements, actual Bridge-v2 prepare/peek/take and single consumption for each of the three reviewed consumers, TTL expiry, corrupted packet rejection, double handoff guard, legacy v1 handoff, preserving >20 unique existing materials, editor navigation without payload in URL, and source helper refusal before bridge write.

## Explicitly NOT certified

- Full multi-tab browser E2E on Chrome, Safari, iPadOS and Android with deployed Generator/Differentiator/LUDUS. Node Bridge conformance is not equivalent to a consumer actually importing and rendering the material.
- Current `main` full green CI/release gate: offline source snapshot and newest GitHub registry have version differences.
- Inbound consumer UIs and existing source-app implementations under adverse browser storage quotas, private mode or cross-origin hosting.
- Real student data anonymization, security against malicious same-origin scripts, cryptographic packet authentication, or a live school-server handoff.

## Mandatory production acceptance

1. Apply `stage05-main-rebased.patch` to a fresh clone of `Daniel22-dev/AI-Studio-GHRAB` main (never overwrite source with the older snapshot ZIP).
2. Resolve any patch conflicts against current main, synchronize generated app registries, ensure changed files remain within Studio only, and bump the release version through the existing version tool.
3. Run `npm run test:material-flow`, Studio UX/security/GARP tests, build, full CI-equivalent and `qa:ecosystem`; every mandatory gate must be green before promotion. Review signed access-bundle freshness.
4. In a staging origin with all target applications at the same origin, manually test outgoing and returning anonymous material, incompatible material, student-email canary, oversize, expired/corrupt/pending handoffs, double consume, restore/back/bfcache, and editor on mobile.
5. Confirm no change to Generator source; only then seek an explicit authorization to publish/merge/deploy.

**Gate outcome: NO-GO for production release until (2)-(4) succeed on current main.** The local implementation is a QA candidate, not a live release.

## Independent app-manifest validation and reconciliation

The original strict `aiCore` schema rejected 9/10 of the current deployed application manifests, because it did not represent the existing, legitimate AI Core profiles. An explicit backwards-compatible schema adjustment now distinguishes *integrated* AI Core declarations from *not-applicable* consumers without permitting arbitrary new `aiCore` properties. The optional `materialFlow` declarations remain strictly validated (`bridgeVersion: 2`, supported schemas, known content types), and unknown `aiCore` fields are still rejected.

Independent Draft 2020-12 `jsonschema` conformance has now passed **10/10 manifests in the official GitHub Pages 0.21.253 distribution** and **9/9 in the archived 0.21.241 registry**. Negative fixtures reject bridge version 1, unrecognized AI Core privileges, and server-AI flags on `not-applicable` consumers. The baseline schema/registry mismatch is **resolved in this patch's tested source candidate**; this does not certify all other source/registry releases or the complete GitHub CI.

The Studio resolver was also exercised with the distributed current registry: Generator `7.1.101`, Differentiator `1.3.51` and LUDUS `1.16.31` are eligible according to the reviewed Stage 05 target contract; the other seven apps are not incorrectly advertised as compatible. This is an exact published-registry compatibility check, not proof of end-to-end import into each consumer.

## Follow-up implementation review (same day)

- **Workspace preservation**: invalid JSON / malformed legacy records now block migration, save and deletion instead of being silently purged. The raw stored data are left unchanged; an explicit recovery/export is required.
- **Handoff cancellation**: transport supports an injected storage instance, checks the pending source and packet ID before cancellation, and refuses to cancel foreign-source packets. localStorage is NOT an atomic multi-tab transaction; no atomicity is claimed.
- **Outbound source validation**: normalized roster-key variants are rejected and Studio destination is restricted to same-origin reviewed paths, never an arbitrary same-origin app route.
- **Material details**: the My Materials panel now includes an expandable detail with objectives, safe text preview, task count and a bounded task preview. All user content is written with `textContent`.
- **Isolated browser component QA**: desktop and 390px mobile cards PASS, including a literal `<img onerror>` canary that remains text, not executable markup. A full deployed multi-page browser E2E remains blocked.
- **Current-main changed-path reconciliation**: compared GitHub `main` tree `501d7086a94adf4d6f8abeb145efc81465fcfd8a` with the archive baseline at historical commit `7c944c176dfb73`. Exactly `src/app.js`, `package.json` and `src/config/data-manifest.json` differ among Stage 05 tracked change paths. The reconstructed three files have byte-identical Git blob SHA to the current main (`994512e0`, `2a89b4c7`, `270f0292`), enabling a clean Stage 05 patch rebase model. This is **not** a complete live-main checkout: 258 upstream changed paths exist across the repository, primarily outside Stage 05, including Conversation Lab assets. Full current-main build and CI still require a real checkout.

## Final read-only QA result and evidence scope

Twelve local checks finished with exit code 0 (logs in `evidence/run-01..12.log` in the handoff ZIP). They were run on the staged Stage 05 implementation against archived source `0.21.241`, not on a complete post-integration checkout of the newest main `0.21.253`. For the current-main overlay, all tracked paths were independently matched against GitHub blob SHA values and the generated patch was applied to the simulated touched-file baseline. The official GitHub Pages output provides current registry evidence but is not interchangeable with complete source CI. The release decision remains **NO-GO pending full current-main gates and live consumer E2E**.
