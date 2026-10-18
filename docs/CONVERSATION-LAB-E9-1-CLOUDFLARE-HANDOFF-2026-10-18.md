# Conversation Lab E9.1: exact first-pilot handoff to AI Studio (PRELIVE)

**18. 10. 2026. This is not an activated Studio app.**

- The owner authenticated a personal Cloudflare Pages account and now serves a hotfixed public lesson player at `https://conversation-lab-ghrab.pages.dev/`.
- Independent **real public player** HTTP audit `39101830980` PASSED: exact JS and lesson bytes, root 200, restrictive security headers, 6/6 protected routes returned 404. **LIVE Chromium** audit `39101830957` PASSED **87/87** assertions for actual published AI EN B1 on desktop/390px/320px including stations, offline glosses, timer, QR and browser network hygiene. No user shell commands were required. These are scoped content/security/UI tests; they do NOT constitute signed GARP LIVE or Studio P5.
- The owner approved the pedagogical content of Artificial Intelligence / EN B1 (8 stations, 12 vocabulary items, 4 toolkit, 37 offline Czech glosses) and self-attested the rights to publish. The derived public-only static candidate has lesson SHA-256 `4a163857dc2b90e3b9a3a60e8e4440f7c45c2a1f2530f970a99543925fe390b9`. No lesson data is present in this Studio repository.
- The static player and B1 lesson are **actually public and verified** at Cloudflare; however independent security/owner **release signatures**, GARP LIVE for the player, and Studio P5 have **not** been completed. The Studio signed access bundle does not contain `CLB-01`, so the Studio launcher remains disabled.

## Concrete integration work remaining

1. **DONE:** Owner manually replaced the Pages Production upload with the public-only hotfix ZIP; deployment validated in HTTP and LIVE Chromium; keep the previous deployment for rollback.
2. A read-only GitHub network audit verifies exact current player asset and lesson SHA, HTTPS security headers, no draft leakage, 404 and route/QR behavior. Perform hands-on Safari/iPad and Android tests in addition.
3. Independent release/security authority verifies the exact content/manifests, signed owner GO and actual GARP 2.7 LIVE requirements. Prior read-only placeholder audit is not sufficient.
4. Register a `conversation-lab` app with English/Czech descriptions, Cloudflare origin and E9 exact release binding; issue a **genuinely signed** CLB-01 access policy + permits for trained teachers. Students use the public link/QR without Studio permits. Never transfer permit/token/roster.
5. Run Studio P5/Safe Promotion explicitly, verify LIVE teacher route and role denial, then activate Studio tile and observe rollback path. Keep cross-repo Auto Promotion disabled.

No source passwords, API keys, owner contact details, private lesson proposals, or student roster are stored here. **Do not merge PRELIVE PR #256 into candidate until P5 release approval.**

## Verified live status 2026-10-18

Public pilot: **UP**, real lesson AI B1 and 37 contextual Czech glosses available through the independent origin. Live network/Chromium evidence: [HTTP](https://github.com/Daniel22-dev/conversation-lab-source/actions/runs/39101830980) and [Chromium](https://github.com/Daniel22-dev/conversation-lab-source/actions/runs/39101830957), all green. Player hotfix ZIP hash `f11b0823e5ce0225f01cfbc24a11b367cf163bb2823ee3c96f1e62bc644260cb`; browser JS `dabcaced97ca6ec21890a43eb43cf5da3600d106d0164fd5de570ebc7855c03a`; content JSON `4a163857dc2b90e3b9a3a60e8e4440f7c45c2a1f2530f970a99543925fe390b9`. **Studio remains in PRELIVE HOLD** while access-bundle signing, GARP LIVE / independent authorization, Studio P5, formal training and permit issuance are outstanding; do not falsely claim activation or merge PR #256.
