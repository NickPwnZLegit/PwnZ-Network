# PwnZ Network social release: video footage and creator economy

Status: **video-link playback and browser-local MP4/WebM preview candidate; direct uploads and financial products NOT activated.**

## Member social target
- Members create posts, follow other gamers, message via approved mutual connections and join creator communities. These features must be tested with two distinct consented accounts after Firebase rules and indexes are independently validated.
- Video posts support YouTube, TikTok, Instagram, Facebook and Twitch links. Playback runs in the existing PwnZ interface using an explicit Expand & Play click; when a provider blocks embedding, the viewer can voluntarily open the original provider link.
- Local gameplay video previews accept MP4 or WebM up to 45 MiB and 30 seconds, validated client-side. **The local preview does not upload a file or create an account post.** This is a UX precursor, not storage infrastructure.
- Planned native uploads use a server-scoped private reservation, direct object storage, authentic codec/duration inspection, malware and policy review, rate limiting, per-member quotas, moderation queue and original/transcoded-file deletion.
- Planned creator subscriptions and member subscriptions are different from Arena gameplay entitlements. Public social viewing does not require a paid Arena subscription. Approved Creator subscriptions may eventually offer extras but not bypass moderation.
- Planned donations to posts and creators use a separate on-chain/processor wallet module with explicit recipient selection, consent, compliance, support/refund policies and a public accounting ledger. Proposed HOPE, PWNZ, EDEN, LCAI and USDC **must not** be displayed as supported payment assets until vetted chain contracts, gas fees, escrow/custody, prices and settlement are verified. Do not infer token support from token names.
- Livestreaming initially embeds an authorized broadcaster's Twitch channel and does not store a recording. Native live video ingestion needs its own low-latency service, separate from video upload and from the WebAssembly/WebGL game runtime.
- Game packages are different from MP4 media, and must be staged, licensed, reviewed and run in a separate untrusted browser origin. ANNEAL/HI may generate recommendations for moderators but cannot decide payouts, accounts, identities or launch readiness.

## Outstanding social production gates
1. Current PwnZ Vercel environment does not contain `PWNZ_SOCIAL_BACKEND_ENABLED`. The `api/pwnz-config` endpoint is fail-closed until it is `true`. **Do not turn this on by configuration alone.** The PwnZ candidate Firestore rules are not proof that combined Light of Hope/ PwnZ rules and indexes are deployed safely.
2. Test account sign-in, 30-day agreement, Eden RealID linkage, private profile ownership, public posts, follows, private messaging, blocks and report/remove actions using Firebase emulator and separate accounts.
3. Review PwnZ-only moderation/reporting queue and notification delivery; prevent abuse and ensure owner-only post deletion.
4. Verify PwnZ live domain, secure Firebase authorized domains, real browser/mobile acceptance and deployment; check cross-site messaging/SSO before asserting a unified account experience.
5. Build private upload server and review workflows before exposing file uploads publicly.
6. Payments remain disabled until separate independent compliance and signed contract review.

Rollback: disable the backend or video capability gate, unpublish offending media, preserve minimal audit evidence and never leak Eden RealID material.

This intentionally mirrors Light of Hope's existing linked-video model without claiming it can already accept MP4s.
