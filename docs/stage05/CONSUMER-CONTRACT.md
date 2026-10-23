# Stage 05 consumer contract (Studio-to-app material handoff)

## Input

- Only `schema: 'ghrab-material-v1'` with a fully valid payload (the canonical validator is `src/shared/material-validator.js`).
- `provenance.containsPersonalData === false` must be explicitly asserted after teacher review.
- No student rosters, student names/emails, PII-identifying structured fields, dangerous HTML/script markup or oversized material. Names appearing in natural-language text are NOT reliably detected; manual review remains essential.
- Recommended material JSON max 480,000 encoded bytes, leaving room for a Bridge 2.0 envelope; Bridge max 500,000 bytes.

## Registry and manifest

The Stage 05 Studio-owned file is `src/config/material-flow-registry.json`, schema `ghrab-material-flow-registry-v1`, with declarations:

- `id` matching registered app ID.
- `bridgeVersion: 2` and `importSchemas: ['ghrab-material-v1']`.
- `exportSchemas` is informative and can be empty at inbound-only stage.
- `contentTypes`: `source-text`, `structured-tasks`.
- `requirements`: `minSourceChars`, `minObjectives`, `minTasks`, `taskTypes`, `oneOf`.
- `allowedLaunchPaths`: exact, Studio-reviewed site path allowlist, supporting current GitHub and future school-server paths. The target manifest is never allowed to approve its own unreviewed URL.
- `maxBytes`, `verification` (`disabled`, `source-reviewed`, `browser-verified`) and `evidence`.

`src/schemas/ai-studio-app-manifest-v1.schema.json` accepts an optional nonbreaking `materialFlow` field for source manifests. If present, it describes import/export, bridge v2, content types and requirements; a separate Studio-owned launch-path allowlist remains mandatory. This stage does not auto-trust unsigned app claims. An independent JSON Schema check verifies 10/10 manifests from the official Studio 0.21.253 GitHub Pages build, 9/9 in the archived 0.21.241 registry, and rejects unrecognized AI Core privileges and unsupported bridge versions.

## Current declared consumers

| Target | Compatible payload | Existing inbound review | Changed this stage |
|---|---|---|---|
| `generator` | source text or supported structured tasks | generator-testu `src/js/17-ai-studio-bridge.js` | No |
| `differentiator` | source text plus an objective | diferenciator `src/js/25-ai-studio-bridge.js` | No |
| `ludus` | at least 3 tasks of select/truefalse/short/order | Ludus `src/index.html` import handler | No |

`verification: 'source-reviewed'` deliberately does not claim full deployed/browser E2E certification.

## Interactive flow

1. A teacher saves material under My Materials, opens its details and chooses `Pouzit dal...`.
2. Studio shows the reviewed targets and explains accepted/incompatible content, inactive access, and pending handoffs.
3. `Pripravit a otevrit` runs origin/target/content/privacy checks and then `bridge.create(...)` synchronously on the user click. It writes a v2 envelope and temporary v1 compatibility mirror, without including material in a URL.
4. The app is opened with `?studioHandoff=1`; consumer calls `GHRAB_PLATFORM.bridge.take({ target: APP_ID, maxBytes: 500000 })`. Target, TTL, checksum and size are validated. A second take returns null.
5. Consumer imports the material, provides a visible return affordance to Studio and never imports student rosters.
6. An unconsumed packet must never be silently overwritten. Studio shows the pending target and an owner-only cancel action. Default TTL is 30 minutes, maximum is 24 hours; stale/corrupt packets fail closed.

For app-to-Studio outbound producers use `src/integration/save-to-studio.js` as a *portable reference helper*; it now performs initial privacy/size/origin admission, but Studio verifies again after consuming. Source applications must validate material structurally before invoking it. The portable helper restricts Studio destinations to same-origin `/AI-Studio-GHRAB/` (GitHub Pages) and `/ai-studio/` (school-server mount); a same-origin arbitrary path is not an accepted target. Browser/manifest certification of outbound controls belongs to later project stages.

## Storage and editor handoff

Both `ghrab.workspace.v1` and `ghrab.ai-studio.workspace.v1` are synchronized by the canonical adapter, with version/updatedAt reconciliation and rollback on failed second write. **Corrupt or incompatible legacy records are never silently removed by migration**: writes fail closed with `workspace-integrity-error` until an explicit recovery procedure can preserve/export the raw data. Cross-tab writes are checked for change before persistence, but localStorage does not provide atomic transactions. Existing local private drafts can remain stored but are blocked from inter-app transfers. Editor navigation uses only an ephemeral sessionStorage material ID under `ghrab.ai-studio.material-flow.edit-selection.v1`, not a URL payload. The ID is removed on read.

## Server token seam, not activated

The future server transport shall preserve `prepare`, `pending`, and `cancelOwn`, returning only an opaque token to the URL or fragment. It must enforce actor permissions, target binding, expiration, anti-replay, atomic one-time consumption, strict CSRF/origin checks, encrypted transport, deletion/retention limits, and audit records without sensitive content. Do not activate server sharing merely because the client recognizes a flag.
