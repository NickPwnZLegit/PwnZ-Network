# PwnZ.live | Social and member video overhaul
Status: **draft staging foundation, not production upload release**.

## Verified starting point (November 18, 2026)
- Static HTML/ES module social app uses Firebase Authentication, Firestore profiles, posts and agreement checks.
- Firebase public web configuration variable **names** exist in Vercel for preview and production. That does not establish valid values, correct Firebase project identity, authorized domains or deployed rules.
- `/api/pwnz-config` requires `PWNZ_SOCIAL_BACKEND_ENABLED=true`. This variable was not present in inspected Vercel environment names. The backend therefore remains fail-closed unless changed after inspection.
- Video sharing currently supports YouTube embeds and Twitch channel links, not first-party user uploads.
- Never replace the existing Eden account sign-in with mandatory third-party KYC.

## Overhaul workstreams (in release order)
1. **Identity and account reliability:** Existing-account login, new PwnZ name reservation, 30-day agreement logic, recovery, 30-day persistence and verified shared-account linking. Test authorized domains and no cross-domain session assumptions.
2. **Authorization:** Review Firestore rules, PwnZ post/profile/follow/message indexes, moderation, blocked users and real Firebase Emulator tests.
3. **Media staging:** Private owner-scoped Storage uploads, strict MIME/size limits, bytes/signature verification, quotas, cleanup and no public URL before approval.
4. **Media processing:** Server-owned moderation, virus scan where applicable, rights review, transcoding/duration, thumbnails, retention and appeals.
5. **Publish:** Firestore owner/role authorization plus approved media records; never trust client-provided approval, media URL, author or status.
6. **Experiences:** Expand social, gamer profiles, creator galleries, event pages, recordings and livestream links; dedicated pipeline for longer gameplay clips.
7. **Operations:** Budgets, bandwidth limits, dashboard metrics, mobile video playback, accessibility, abuse reporting, rollback/canary release.
8. **Games:** Browser-based licensed/original game hosting and multiplayer matchmaking require independent performance, IP/license, security, abuse and subscription gates.

## This PR
Adds media policy, private staging adapter, non-deployed candidate rules and isolated tests. **It does not wire uploads into the composer, change Firestore rules, enable a Vercel flag, attach public links or modify the production website.**

## Release gates
- [ ] Authorized Firebase staging bucket and rules reconciled against existing Light of Hope storage.
- [ ] PwnZ social backend and session flows tested under authenticated mobile/desktop clients.
- [ ] Complete server-reviewed publishing pipeline.
- [ ] Release moderation policies and user reporting.
- [ ] Quotas, cost controls, lifecycle cleanup, and rollback readiness.
- [ ] Owner approval of the exact production SHA.
