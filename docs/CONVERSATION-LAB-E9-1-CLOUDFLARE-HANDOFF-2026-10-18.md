# Conversation Lab E9.1: exact first-pilot handoff to AI Studio (PRELIVE)

**18. 10. 2026. This is not an activated Studio app.**

- The owner authenticated a personal Cloudflare Pages account and deployed only a zero-lesson placeholder at `https://conversation-lab-ghrab.pages.dev/`.
- The first read-only **real HTTP** automated audit `39100071692` PASSED: root 200, all required security headers, 6/6 protected routes returned 404. No user shell commands were required. This audit checks the **placeholder only**, not the player.
- The owner approved the pedagogical content of Artificial Intelligence / EN B1 (8 stations, 12 vocabulary items, 4 toolkit, 37 offline Czech glosses) and self-attested the rights to publish. The derived public-only static candidate has lesson SHA-256 `4a163857dc2b90e3b9a3a60e8e4440f7c45c2a1f2530f970a99543925fe390b9`. No lesson data is present in this Studio repository.
- The static player and lesson are **not yet deployed** to Cloudflare, security sign-off/GARP LIVE for the player is **not passed**, and the Studio signed access bundle does not yet contain `CLB-01`.

## Concrete integration work remaining

1. Owner manually updates the existing Direct Upload Pages deployment with the prepared **public-only** ZIP, while maintaining previous rollback version. This action changes a public site and requires the owner's approval.
2. A read-only GitHub network audit verifies exact current player asset and lesson SHA, HTTPS security headers, no draft leakage, 404 and route/QR behavior. Perform hands-on Safari/iPad and Android tests in addition.
3. Independent release/security authority verifies the exact content/manifests, signed owner GO and actual GARP 2.7 LIVE requirements. Prior read-only placeholder audit is not sufficient.
4. Register a `conversation-lab` app with English/Czech descriptions, Cloudflare origin and E9 exact release binding; issue a **genuinely signed** CLB-01 access policy + permits for trained teachers. Students use the public link/QR without Studio permits. Never transfer permit/token/roster.
5. Run Studio P5/Safe Promotion explicitly, verify LIVE teacher route and role denial, then activate Studio tile and observe rollback path. Keep cross-repo Auto Promotion disabled.

No source passwords, API keys, owner contact details, private lesson proposals, or student roster are stored here. **Do not merge PRELIVE PR #256 into candidate until P5 release approval.**
