# PwnZ no-archive streaming and private media entitlements
Status: **RESEARCH / DRAFT / DISABLED**, 2026-11-18.

PwnZ and Light of Hope aim to share private billing and quota entitlements for properly linked accounts. This must not expose user linkage in the public Eden ZK uniqueness registry. Account, billing and quota records remain private and securely access-controlled.

## Two separate media types
**Broadcast:** Short-lived browser/OBS/phone-origin stream, provider recording OFF by default, no platform-owned replay. Popular viewing is still billed for delivered minutes. Third parties can independently record or rebroadcast a stream, and buffering may occur.

**Saved uploads:** Photos and clips intentionally retained and published only after safety/rights review and server authorization. Free quota proposed: 500 MiB retained, 750 MiB new data per month. Paid Supporter proposal: 3 GiB / 5 GiB. Creator proposal: 12 GiB / 20 GiB. All values are draft; no prices finalized, no purchases implemented.

## Important constraints
- A live streaming service needs separate provider credentials and a server-created temporary broadcast token; never expose provider API keys in browser source.
- Video viewers consume delivery bandwidth; avoid advertising “free unlimited live video”. Use org-wide cost ceilings, viewer admission controls, timed sessions, warnings and emergency stop.
- Meter trusted server records, not user-submitted counts. Reserve usage transactionally and reconcile delayed provider billing, expired sessions and orphan files.
- No automatic replay, download, or member-feed archive. “Not recorded by us” does **not** mean impossible for viewers or external capture apps to record.
- Optional recording through external tools remains each participant's responsibility, and platform rules, intellectual property and privacy safeguards still apply.
- Uploads and subscriptions must not determine Eden personhood eligibility, DAO base voting, ordinary social posting or access to basic support features.
- Longer gameplay VODs require a separately priced delivery/transcoding architecture, not the existing V16 30s / 45MiB clip limit.
- Protest broadcasts: no automatic geotags, transparent capture disclaimer, consider stream delay/limited audiences, emergency end and moderation reports; protect minors and bystanders, apply viewpoint-neutral rules.

## Release gate
[ ] Validate active Firebase account and PwnZ profile link / 30-day agreement.
[ ] Review Storage and Firestore rules alongside Light of Hope V16; do not copy candidate rules over production.
[ ] Server-side verified plans, webhook payment verification and trusted metering; no charges until explicitly approved.
[ ] Integrate no-recording live provider with owned session lifecycle, clock-safe quotas, timed credentials and kill switch.
[ ] Complete mobile camera permissions, battery/network/reconnect tests and controlled viewer load tests.
[ ] Publish quotas, cost disclosures, privacy/safety policy, cancellation and retention controls.
[ ] CI, manual browser QA, independent security review and explicit owner deploy approval.

This PR has **no live provider integration, checkout, uploaded media or production environment changes**.
