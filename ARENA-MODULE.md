# PwnZ Arena | Foundation module (2026-10-30)

## Access rules
- Public, no Arena subscription: browse game catalog, watch streams and uploads, read posts, participate in chat, and send approved creator donations. Account, age and moderation controls can still apply to social interactions.
- Active Arena subscription, authenticated and verified on the server: play supported browser games and join eligible tournaments.
- Prizes require separate event verification (location/age, rules, skill-only event design, anti-cheat, funded prizes, tax/payout compliance), not just a subscription.
- No paid subscription, gaming launch or prize event is currently enabled.

## Implemented in this branch
- /arena/ responsive landing and searchable/filterable concept game catalog.
- Public-versus-member access explanation and tournament concept cards.
- /api/arena/access GET endpoint that always denies protected actions, with no-store headers.
- Interface checks the endpoint and never treats a client value as authority.
- Updated main homepage linking to the Arena, stating planned public features and membership rules.

## Next engineering work
1. Choose identity and database (e.g. server-managed sessions + database). Never trust localStorage for entitlement verification.
2. Implement trusted payment-provider checkout, subscription webhooks, recurring billing and cancellation, and ledger. Never collect card details directly.
3. Verify active membership using the server-side database and billing reconciliation; protect game-launch/session-creation routes and tournament-registration routes. Browser access buttons alone are not a security boundary.
4. Build moderated posts, chat, media uploads, creator tipping and live streaming with provider credentials and privacy controls. Public viewing can be free; authenticated account requirements can still apply to posting, tipping or chatting.
5. Integrate an original or properly licensed browser game and multiplayer authority server; separately measure latency, server costs and bandwidth.
6. Introduce tournament scheduling, event eligibility verification, anti-cheat and results before any prize distribution.
7. Legal review: game licenses, subscription and refund terms, contests and awards, state/country restrictions, age rules, data protection, tax and crypto/token distributions.

## Security and licensing
Open-source code licenses do not automatically grant commercial rights to a game's names, levels, music, audiovisual assets, trademarks or proprietary builds. Do not copy/distribute Halo assets or charge for them without appropriate rights. Blockchain does not replace the simulation or graphics engine.


## Expanded social network requirements (October 30, 2026)
- **Distinct identities:** PwnZ profile name is a separately reserved, unique public gamer/creator handle. Eden RealID stays the underlying private Light of Hope ecosystem credential. Do not expose identifiers, wallet credentials or face/thumbprint data across sites by default. Cross-network visibility is opt-in.
- **Cross-site login:** Implement secure shared SSO authorization (for example OpenID Connect Authorization Code + PKCE), scoped audiences and secure token handling. Never pass raw authentication tokens or a biometric proof in query strings.
- **PwnZ profiles:** avatars, profile bios, uploaded/link media, Twitch/YouTube channel associations, stats, posts, followers and moderation. Require channel ownership verification before marking accounts as verified.
- **Livestreams:** /live/ provides a working Twitch channel embed with valid hostname parent, optional chat embed and shareable channel link. Embeds are subject to Twitch availability, supported browsers and broadcaster settings. Streaming remains on Twitch; PwnZ does not ingest or rebroadcast copyrighted streams.
- **YouTube:** /community/ offers an actual in-browser preview of supported YouTube links using youtube-nocookie.com. The preview does not persist content.
- **Uploads:** direct-to-object-storage signed uploads with size limits, quotas, transcoding, virus/content review, rights complaints, access controls and retention policies.
- **Community posting:** server-owned post/comment/media records; authenticated users can create or modify only their own posts. Support reporting and moderation workflows, pagination, timestamps, audit logs and anti-spam rate limits.
- **Donations:** creator support is optional and distinct from monthly Arena membership. Requires processor authorization, supported payout regions, ledger, receipts, refunds, compliance and abuse review before enabling transfers.
- **Permissions:** public viewers can watch Twitch/YouTube and browse PwnZ profiles/content without Arena subscriptions. Posting, commenting, tipping and uploads require a signed-in account and applicable safeguards. Gameplay and tournament entry require an active, server-verified Arena subscription. Winning/claiming prizes has independent event-specific checks.
- **Network switcher:** PwnZ ↔ light-of-hope.net site links available in navigation now; seamless authenticated switching follows SSO integration.
- **Status:** pages are design/integration foundations, not a working social backend or verified identity registration.

## Social TestNet implementation, October 30, 2026
- `/social/` contains Firebase client auth sign-in/registration, unique PwnZ handle transactions, PwnZ profile bio and streaming links, Firestore public posts, YouTube or Twitch link attachments, comments, follows and post deletion.
- `/api/pwnz-config` supplies public Firebase Web SDK config when deployed environment variables are set. Set PWNZ_FIREBASE_API_KEY, PWNZ_FIREBASE_AUTH_DOMAIN, PWNZ_FIREBASE_PROJECT_ID, PWNZ_FIREBASE_APP_ID (optional STORAGE_BUCKET and MESSAGING_SENDER_ID) on the PwnZ Vercel project. Do not use Firebase Admin credentials in web config.
- `security/pwnz-social.rules` is a **rules candidate only** and is not deployed. It is written as a standalone ruleset; merge its collection match blocks into the existing Light of Hope Firebase rules if using the same project. Never replace Light of Hope's rules wholesale.
- Authentication identities may share a Firebase project with Light of Hope **only after** confirming domain allowlists, project credentials, account sharing consent, and that rules cover both apps. A new PwnZ-created Firebase account is not the same as a verified activated Eden RealID. Cross-site single sign-on and RealID linking remain separate work.
- Firestore compound indexes required: pwnzPosts(status ASC, createdAt DESC); pwnzComments(postId ASC, createdAt ASC). Verify index and rules in emulator before launch.
- Public profile documents currently contain only PwnZ-specific display information. Do not add an Eden RealID public field, private user contact details or wallet proof.
- IMPORTANT: TestNet moderation needs reporting, block controls, automated abuse defenses, retention policy, and a restricted signup plan before broad public launch. Do not mistake CRUD foundations for moderation-ready social launch.
- Twitch embedding is simple and already in `/live/`; third-party stream hosting stays on Twitch. PwnZ does not ingest streams.
- Next milestone: integrate moderation and owner-only media upload pipeline before public production, then direct messages and notifications. Membership-gated gaming is later.
