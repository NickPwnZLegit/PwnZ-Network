# PwnZ.live | Consolidated overhaul and media release candidate

Status: **DRAFT / PREVIEW ONLY / NOT PUBLISHED TO MAINNET**, November 18, 2026.

## What happened to the previous overhaul
- PR #4, **Unified PwnZ Social + Messenger**, was already merged into `main` on November 5. It installed the basic compact global navigation, separate Eden/PwnZ messenger adapters, social feed, member profiles, agreement workflow, badge foundation, and a locked Arena preview.
- PR #2 is the superseded, still-conflicting early social proposal. Do **not** merge it on top of #4.
- PR #8, this branch, consolidates the latest media and social fixes without redeploying production. It is **not** a production-ready gaming platform or public media launch.

## Present in this PR
1. Compact mobile navigation: five primary destinations (Home, Social, Members, Messenger of Light, Arena), drawer for gamer signup, My Profile, PwnZ chat, creators, Twitch, and external LightVault/Eden/Light of Hope links.
2. New PwnZ-only members can use Firebase email signup, choose a unique PwnZ handle, and accept PwnZ's 30-day agreement. Eden RealID is **not required** for PwnZ-only social participation. Existing Eden users keep their verified account/Light of Hope agreement and create a separate public gamer name.
3. Public post scopes: social feed, personal profile, creator, gaming update, and community. Members can filter posts by scope. The profile link opens their own scoped feed and composer.
4. External videos: YouTube and Twitch remain supported; TikTok public video URLs and Instagram Reel/post URLs are canonicalized and rendered as safe **outbound links**, not untrusted embeds or downloaded third-party files. Firestore **candidate** rules reject arbitrary external URLs and schema changes.
5. PwnZ personal files: optional photo/30-second MP4/WebM upload from the composer and private Media Lab. A preview-only backend validates Firebase identity, private PwnZ profile, agreement, file size/type/scope, free-tier usage, and 30-minute reservation. Firebase Storage candidate rules permit staging **only** for that reservation, and deny downloads. A verified completion changes status to `pending-review`, not `published`.
6. Manual moderation: signed-in members can report posts; per-user reports stay private in `pwnzPostReports`. User-post deletion already exists. Moderators may review through an authorized administrative workflow, which must be configured before activation.
7. The existing Gamer/Game Creator role application remains a separate, review-based enrollment path. Being a Member or Gamer applicant does not activate subscriptions, browser games, prizes, or restricted gameplay.
8. Messenger of Light uses the existing Light of Hope conversation adapter for independently verified Eden users, with a separate PwnZ mutual-follow chat. Link access does **not** create cross-domain SSO or merge confidential message databases.
9. LightVault is available as a clearly labeled link to the Light of Hope wallet interface; it neither transfers wallet custody nor grants access to someone else's wallet. Separate account authentication can still be required.

## Safe-by-default constraints
- Vercel production branches do not receive new live Firebase permissions. PwnZ media intake requires `VERCEL_ENV=preview`, `PWNZ_MEDIA_INTAKE_ENABLED=true`, `PWNZ_SOCIAL_BACKEND_ENABLED=true`, a matching Firebase project/bucket and valid **server-held** Firebase Admin credentials.
- The Media Lab also requires a separately enabled preview flag. With no enabled backend, it is a local-only preflight at most.
- Private staged files **never become public** merely because they were successfully uploaded. Backend real-content sniffing, trusted clip-duration verification, image/video processing, moderation and an approved publishing API are NOT yet implemented.
- No Cloudflare Stream provider connection, no paid subscriptions, no HOPE/EDEN/LOH/PWNZ transactions, no live one-person-one-identity decision, no ANNEAL production authorization.
- User-submitted external videos are not proof of content ownership or provider authorization.
- Never copy Firebase Admin credentials, member data, private messages, identity mappings, biometrics or keys into this repository.

## Required gates, in order
1. GitHub CI and JavaScript parse tests for the **exact PR head SHA**. Restore strict rule structure; no duplicated Firestore sections.
2. Firebase Firestore and Storage emulator tests with synthetic accounts, role/agreements, duplicate handles, third-party link schema, private media reservation, expired tokens, cross-user uploads, report abuse and revocation. Confirm IAM for Storage-to-Firestore rule reads.
3. Review actual production Firestore and Storage permissions and reconcile rather than overwriting. Keep staging preview-only during this step.
4. Confirm Vercel preview and test on Android/mobile and desktop: signup, existing Eden login, agreement expiry, account persistence, name reservation, navigation, Messenger, LightVault redirect, profile edit, external video links, scoped feeds, file preflight, private upload and rejection.
5. Complete private uploader cleanup/refund, malware/content scanning or equivalent trustworthy human-review intake, content-type sniffing, decoded video-duration checks, thumbnail/transcoding, safe delivery, moderation decisions, appeal/deletion/export and abuse throttling.
6. Validate private usage dashboard, provider bills and organization-wide caps before activating paid upgrades. Keep livestreaming nonrecording and disabled until backend and costs are tested.
7. Check production rollback, owner authorization, and **only then** merge and promote a pinned release. Never treat READY preview as end-to-end readiness.

PwnZ.live DNS is now configured correctly and the existing Vercel production deployment is READY; this branch does not change domain settings.
