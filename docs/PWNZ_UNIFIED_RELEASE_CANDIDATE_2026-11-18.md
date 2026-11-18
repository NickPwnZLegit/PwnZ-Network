# PwnZ Network | Unified media + live preview candidate (2026-11-18)

**PREVIEW ONLY; DO NOT MERGE TO PRODUCTION BEFORE ALL RELEASE GATES ARE SATISFIED.**

This branch combines draft PwnZ PR #6 (private media staging) and #7 (no-archive livestream policies and optional subscription quotas). Both code paths remain disabled and require independent provider credentials, trusted moderation, robust quotas and privacy protection before activation.

## Domain incident
Vercel confirms the existing PwnZ production deployment is READY and attached to pwnz.live, but currently reports a misconfigured external DNS A record at 91.195.240.94. Name.com currently hosts the domain's nameservers. No GitHub merge or Vercel redeployment can repair that Name.com DNS record. DNS must be corrected separately, using exact values from Vercel's PwnZ domain configuration.

## Combined CI and release gates
- [ ] GitHub social release tests, private media policy tests, and live/quota tests pass for this exact SHA.
- [ ] Existing email-first login, Firebase authorized domain, Firebase app configuration, Eden account linking, separate PwnZ handle, agreement and member profile tests in browser and emulator.
- [ ] Firestore + Storage rules reconciled and deployed by the reviewed procedure, never blindly overwriting existing rules.
- [ ] Server-authorized media staging and processing; moderation, scanning, limited visibility, deletion/appeal and reporting.
- [ ] No platform-owned recording of user livestreams; streaming provider start/stop, expiring credentials, broadcast delay/stop and cost controls.
- [ ] Subscriptions must use verified webhook/entitlement state and transactional counters, with no new ID/KYC requirement.
- [ ] PwnZ production site and DNS must be healthy; stage reviewed production SHA and keep rollback candidate.
- [ ] Manual mobile and desktop end-to-end QA and explicit owner sign-off.

No real media, payments, tokens, identity credentials, streaming provider keys or member data are stored in this repository.

## Creator Media Lab update (2026-11-18)
**Launch status: HOLD.** The PwnZ social composer now has a *separate, hidden* local-only file preflight panel. It checks selected image/video metadata, the proposed 45 MiB / 30s video limit, and intended social/profile/creator/community scope without transferring files to Firebase or publishing a post.

The Media Lab is structurally unavailable in production: `PWNZ_MEDIA_LAB_ENABLED=true` and `PWNZ_SOCIAL_BACKEND_ENABLED=true` are insufficient unless `VERCEL_ENV=preview`. It also requires an authenticated PwnZ profile and the current signed agreement. The existing external YouTube/Twitch sharing and social posting paths remain unchanged.

**Still required:** repair/verify complete account and RealID linking flow; trusted authenticated PwnZ upload-reservation backend; Storage rules + Firebase emulator; media scanning/transcoding/review and moderated delivery; downloads/deletion; monthly usage counters, optional subscriptions and cost brakes; real live provider with recording disabled; mobile testing. No media backend credentials or public upload policies were changed.

The branch remains a **draft release candidate**, not a public media-launch authorization. Do not merge to main, enable billing, or switch production domains until these gates are satisfied.
