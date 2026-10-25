# P0: GHRAB Platform Bridge v2 source/target version-range bug

## Root cause — verified in canonical Platform 1.1.2

The exact same Git blob `d8a36f023e2930b0b3c0bb045e5ed6b2e464bd2a` (58,204 bytes) is installed as GHRAB Platform 1.1.2 in AI Studio, Differentiator, and GIT. The real `createHandoff()` invokes `validateHandoff(packet,{target: packet.target.appId})`. Validation incorrectly compared `packet.target.versionRange` to the *current source app's* `appVersion`:

```js
if (appVersion && range !== '*' && !satisfies(appVersion,range))
  return { ok:false,code:'version-range' };
```

Consequently Studio 0.21.255 sending to Differentiator `>=1.3.51 <2.0.0` and Differentiator 1.3.51 sending to Studio `>=0.21.6 <1.0.0` fail **on the sender**, before real consumption. Previous source/component tests used `targetVersionRange:'*'` or fake Bridge; 2/2 P5 success did not exercise this cross-version case. This is a genuine Stage05 production release blocker, independent of signed-access UAT.

## Narrow correction — Platform 1.1.3 review candidate

Keep immutable 1.1.2 vendor untouched. Create **new** version 1.1.3 as a patch release. In `validateHandoff()`, enforce the target range only when `appId === packet.target.appId` (this actual runtime is the receiver). For a sender performing preflight, still validate schema, destination, expiry, payload, size, checksum, and pending handoff but **do not compare the receiver range to the sender's version**.

- The receiving application still enforces its real version and target match and rejects mismatching versions.
- Do not replace version ranges with `*`, forge a packet, bypass access, change TTL, weaken checksum, or modify any consumer-app permit.
- New `vendor/ghrab-platform-1.1.3/` has immutable manifest SHA256; source mirror and Studio consumer declaration updated.
- `tests/stage05/bridge-cross-app.test.mjs` covers **both directions**, version-negative case, pending preservation, one-time consume, target mismatch and checksum tamper using the actual vendored JavaScript in isolated Node VM contexts.

## Release and dependency policy

**Review branch only. Do not merge directly to candidate or main until release gates pass.** Stage05 user acceptance remains NO-GO. Platform 1.1.3 vendor must be propagated to the Differentiator producer used for Stage06, with synchronized consumer metadata and independent P5; already deployed GIT/LUDUS consumers may stay on Platform 1.1.2 because their receiver-side version check is semantically correct.

After platform 1.1.3 regression CI, run full Studio P5 against exact new candidate release SHA; validate signatures, PWA/offline, Platform conformance and GARP. Then carry out genuine authorized 3x2 real-consumer UAT to close Stage05. Promotion to production remains subject to the existing protected `candidate -> main` PR #305 and release-owner acceptance. The current `candidate` remains untouched until review is certified.
