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

## Distinct PwnZ account paths, badges and Messenger switcher
- New account: register with supported Firebase Authentication email/password in the same approved Firebase project, then reserve a unique lowercase PwnZ handle. A PwnZ-only account is not automatically a verified Eden RealID and cannot bypass Light of Hope messaging eligibility.
- Eden account: sign in with the Firebase credentials that already own the Eden RealID, independently verify the private `profiles/{uid}`, `edenRealIdOwners/{uid}`, and current `agreements/{uid}`. Never authenticate by typed Eden handle alone. After sign-in reserve a distinct PwnZ name.
- The account selector is NOT cross-domain SSO. SSO requires an audited shared authorization flow later.
- PwnZ Member badge comes from a profile record. First Signal, Signal Architect, Orbit Builder and Clip Caster derive from posts/follows; Eden Bridge requires active owner and agreement checks. Other badges are future cosmetic milestones only, without token rewards or privilege grants.
- Messenger network switcher on `/messenger/` offers PwnZ, Light of Hope, EdenNetwork, LOH Community and EnderNet. Network labels are UI context ONLY until additional websites and verified account directories exist; all eligible conversations remain in existing `lightConversations`.
- Private message access still requires valid owner, active Light of Hope profile, current agreement, participant checks and blocks. Current cross-network messaging adapter is development only; do not deploy against Light of Hope data until Firestore emulator tests pass.
- Additional Firestore query index `pwnzPosts(authorUid ASC,status ASC)` included to support badge progress.
- User-created accounts require abuse controls, verification and explicit identity-link policy before open registration. Tokens, airdrops and tournament privileges are NOT attached to cosmetic badges.

## Current integration inspection (Oct 30, 2026)
- Vercel `pwnz-network` currently has **zero configured project environment variables**, while the `light-of-hope-site` project has the `VITE_FIREBASE_*` public web configuration keys. No Admin SDK credential has been copied. PwnZ cannot connect to the shared database without assigning only the corresponding public client config to its own preview environment.
- The Messenger TestNet now contains an exact PwnZ handle finder. It looks up a public PwnZ name and requests a conversation in the **same** existing Light of Hope `lightConversations` collection, relying on the Light of Hope member, recipient and block rules for authorization. It does not grant write access itself.
- Firebase initialization has been normalized to the default app instance for both PwnZ pages, allowing authentication persistence on the same PwnZ domain when using the same configured Firebase project. It does **not** provide seamless cross-domain login or SSO.
- Do not deploy PwnZ standalone Firestore rules over Light of Hope rules. Merge collection matches and run emulator tests with two valid members, a PwnZ-only account, blocked contact, expired agreement, guest, and spoofed author.
- Identity and messenger integration remains a gated preview pending authorized domain configuration, merged rules, safe member discovery and moderation. Current browser checks are not replacements for server-enforced rules.

## Combined Social + Messenger release gate (2026-10-30)
- Scoped six **public client Firebase settings** to PwnZ's integration **preview branch only**, retrieved from the existing Light of Hope Vercel project's public VITE_FIREBASE configuration. Never copy Admin SDK or private credentials.
- Added a server-side configuration gate: `PWNZ_SOCIAL_BACKEND_ENABLED=true` is required for the PwnZ endpoint to return client configuration. It is **unset**, so logins, posting and messaging on PwnZ remain unavailable.
- Basic static route and source-marker checks succeeded for social profiles, posts, comments, follows, badges, exact-handle contact lookup, shared `lightConversations` and reporting.
- Vercel reports a READY preview deployment, but this is a **build status**, not proof that Firestore rules, authorized domains, login, cross-network messaging or moderator functionality work.
- **Before enabling/merging the combined PR:** (1) merge PwnZ rules into the existing Light of Hope rules without replacing them, (2) deploy indexes, (3) configure authorized domains, (4) run Firebase emulator guest/new account/verified Eden/two-member/blocked-member/expired agreement/impersonation tests, (5) add user reporting, blocks and moderation, (6) browser-test both websites and Messenger, (7) enable only after approval.
- Do not merge code that exposes open registration to real verified Light of Hope Firebase user data before these checks pass.
