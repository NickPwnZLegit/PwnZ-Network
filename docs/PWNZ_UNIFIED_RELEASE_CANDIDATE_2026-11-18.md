# PwnZ unified release candidate | November 18, 2026

**Current state: PREVIEW / DRAFT. No production merge, promotion, new public uploads, billing or live stream activation.**

The prior social + Messenger overhaul was merged as PR #4. PR #2 is superseded and conflicted. This PR #8 adds the compact-navigation update, PwnZ-only email signup with separate gamer handle and 30-day agreement, optional existing-Eden account path, PwnZ + Light of Hope Messenger access, external LightVault link, gamer application entry points, scoped social/profile/creator/gaming/community posts, validated YouTube/Twitch/TikTok/Instagram links, a private reporting queue and preview-only authenticated photo/video staging.

Personal files go to restricted staging for moderator review only, with provisional free-tier limits, Firebase server reservation and candidate Storage policy. **There is no approved public video publishing pipeline yet.** The private backend requires explicit preview environment flags and Firebase Admin credentials that are not present in production.

Canonical release steps, test gates and unresolved blockers: [PwnZ consolidated overhaul release](PWNZ_CONSOLIDATED_OVERHAUL_RELEASE_2026-11-18.md).

PwnZ.live DNS is currently healthy on Vercel; current site stays in place until tests and release approval.
