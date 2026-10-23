# AI Studio Stage 05 - Material Flow Hub: audit and target architecture

Date: 2026-10-23. Status: IMPLEMENTATION CANDIDATE / NOT RELEASE-APPROVED.

## Authority and baseline

- Binding request: `05_AI_STUDIO_MATERIAL_FLOW_HUB.txt`, plus the user's central stages roadmap.
- Inspected GitHub repository: `Daniel22-dev/AI-Studio-GHRAB`, branch `main`, tree `501d7086a94adf4d6f8abeb145efc81465fcfd8a` at inspection time. Main package reports `0.21.253`.
- The available complete offline source snapshot `AI-Studio-GHRAB-main(2).zip` is older (`0.21.241`). It is a staging test base, **not** an authorized production rollback or deploy input. Generate the production candidate by applying the supplied patch to a freshly checked-out main and re-running all gates.
- Inspected read-only consumers on current repository main: Generator `src/js/17-ai-studio-bridge.js`; Differentiator `src/js/25-ai-studio-bridge.js`; LUDUS `src/index.html` section `studioTake`/`studioImportMaterial`.
- No code in `generator-testu` was changed. No GitHub, Cloudflare or deployment changes were performed.

## Findings

1. Duplicate workspace authorities: `src/app.js` read/wrote `ghrab.workspace.v1` while `src/bridge/studio-bridge.js` preferred `ghrab.ai-studio.workspace.v1`, falling back to the legacy key only if the newer key was absent. The two views could diverge. In the updated code, the central GHRAB API owns both keys; the facade delegates whenever GHRAB is loaded and keeps a backwards-compatible fallback.
2. Manual if/else compatibility in `src/workflow/workflow.js` allowed only three fixed application cases. Replaced by a declarative reviewed registry and generic compatibility resolver; unrelated apps no longer clutter the destination picker.
3. The legacy `src/app.js` handoff path and Platform Bridge 2.0 both existed. The new destination UI always uses one transport adapter; the legacy API remains for compatibility and now adds an outbound safety check.
4. `src/integration/save-to-studio.js` is a **source-app outbound helper**, not proof that eight applications have an operational outbound button. It now performs first-pass PII/size/origin checks. AI Studio validates incoming packets again before saving.
5. `ghrab-handoff-v1` is still supported as a temporary compatibility mirror; it cannot be removed until consumers are migrated. Both handoff keys are consumed together by the v2 platform bridge.
6. `src/library/material-service.js` describes server-side commission sharing, but this does not mean a shared school server or central shared database is active. Its activation requires a real school-server profile and feature flags.

## Trusted deployment topology

Studio and the three currently observed GitHub Pages consumers share the origin `https://daniel22-dev.github.io` while using separate paths (`/AI-Studio-GHRAB/`, `/generator-testu/`, `/diferenciator/`, `/Ludus/`). Shared-origin localStorage makes transient handoff technically possible within the same browser profile. A Cloudflare-hosted, differently-hosted, cross-origin, incognito or separate-device consumer cannot read the packet. The resolver rejects foreign origins and paths absent from the reviewed Studio allowlist.

## Target architecture

```
 GHRAB Material v1 producer          Source app, approved export
               |                           |
               +------------+--------------+
                            |
              AI Studio / My Materials
              canonical workspace adapter
              legacy/current migration
                            |
          material schema + anonymity admission
                            |
          reviewed declarative target registry
          + import schema + bridge + content
          + allowed launch path + capabilities
                            |
             prepare one-time v2 handoff
             (max 30 min default, 500 kB)
                            |
      same-origin permitted target consumer
      (Generator / Differentiator / LUDUS)
                            |
              consume once; return to Studio
```

The public interface is `createHandoffTransport(...)` with `prepare()`, `pending()` and `cancelOwn()`. It returns `kind: 'local-first'` and separates user-facing selection from transport. A future school-server implementation can implement the same controller-facing methods with an authenticated, single-use, short-lived token. Server-side authorization, CSRF/origin protection, encrypted transport, binding token to source/target and one-time atomic consumption will be mandatory.

## Explicit decisions and residual issues

- Materials remain local to each browser; workspace merging does not synchronize across devices.
- PII checks are conservative heuristics and **not a guarantee of anonymization**. An explicit teacher assertion is required and the recipient must independently validate the material. Real student data must not be used in tests.
- Existing Bridge v2 FNV-1A checksum detects accidental modification; it is not a signature or authorization proof. Same-origin malicious scripts remain an environmental threat.
- The core Platform v2 `peek()` can clear a corrupt packet and can clear one when used with the wrong target; new Studio code uses `allowAnyTarget` for pending inspection, but the historical platform API is unchanged to preserve consumer contracts.
- A full cross-repository browser/device E2E acceptance and a current-main CI green gate are still required before production. The offline snapshot has baseline ecosystem version drift independent of Stage 05.
- No independent hosted application manifests currently declare all Material Flow details. The Studio-managed reviewed registry is transitional. The app schema now allows optional `materialFlow` metadata for gradual, backwards-compatible migration without an N-by-N direct-app mesh.
- The pre-existing strict `aiCore` schema incompatibility was reconciled by representing the existing integrated and not-applicable profiles explicitly, while continuing to reject unknown AI Core fields. Verified against 10/10 current deployed manifests and 9/9 older manifests using independent Draft 2020-12 validation. See test report; live imports are a separate gate.
