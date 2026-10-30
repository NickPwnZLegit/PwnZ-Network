# Combined Social + Messenger release gate
Date: 2026-10-30
Status: PREVIEW ONLY. Not safe to merge to production until conditions below pass.

## Authentication owner verification (2026-10-30)
- User-provided Firebase Console screenshot confirms `pwnz.live` and `www.pwnz.live` appear under Authentication > Settings > Authorized domains.
- User-provided Firebase Console screenshot confirms the Email/Password provider is enabled.
- Existing automatic account linking by matching email was displayed selected; this is **not** proof of Eden RealID ownership and is not cross-domain single sign-on.
- The exact Vercel preview hostname has **not** been confirmed in Authorized domains. Browser tests on a protected preview may need separate temporary authorization, especially for redirect-based providers.
- **No further manual action needed on the production PwnZ domain entries.**

## Firebase Console: manual owner steps
1. Open Firebase Console (console.firebase.google.com) and select the **same project** already used by Light of Hope. Do not create a second Firebase project.
2. **Confirmed:** `pwnz.live`, `www.pwnz.live` and Email/Password are already enabled, no need to add them again. The specific protected Vercel preview host may still need temporary authorization for full browser tests. Do not enable anonymous auth or unreviewed OAuth providers.
3. Do not paste private keys or API secrets into chat. The public Firebase web configuration has been copied to branch-scoped PwnZ Vercel preview settings; `PWNZ_SOCIAL_BACKEND_ENABLED` is deliberately unset.
4. **Do not publish the standalone `security/pwnz-social.rules` file.** Instead carefully insert PwnZ helpers and collection matches into the current, deployed Light of Hope Firestore rules, preserving all existing restrictions. Confirm which deployed ruleset is authoritative; `security/v16-production-candidate.rules` is a GitHub candidate, not proof of deployment.
5. Configure/create the PwnZ composite indexes using `security/pwnz-firestore.indexes.json` in the correct project, without overwriting existing Light of Hope indexes. Verify them READY.
6. Until automated moderation and anti-spam exist, restrict signup to trusted testers.

## Security audit blockers found
- PwnZ draft publicly exposes `pwnzHandles/{handle}.uid` and `pwnzProfiles/{uid}`, allowing linkage between PwnZ and the same Firebase UID used by Eden/Light of Hope. This conflicts with the promised privacy of distinct identities. Before public rollout, move handle resolution and public profile projection into a trusted backend that withholds internal UID, and provide private alias lookup only for authenticated eligible messengers.
- `social/social.js` currently writes directly to Firestore from the browser. This requires production-grade server-enforced restrictions, reporting/block/retention, and rate limiting before untrusted signup is allowed.
- Existing `lightConversations` rules require active Eden RealID and current agreement. A PwnZ-only account **cannot** use Messenger of Light until a separately reviewed eligibility expansion exists. Never relax them merely to make the UI work.
- Messenger uses existing participant IDs and a participant-only database, not encrypted end-to-end chat.
- Client authentication check only improves UX; Firebase security rules must enforce all authorization. Verify two-account isolation and no spoofs.
- Separate site cookies are not shared. Entering Eden RealID is not authentication. Firebase login on both domains is not seamless SSO.

## Test cases before switching backend gate on
- Guest can read permitted public posts but cannot write.
- New PwnZ account can reserve exactly one handle, and cannot claim a different UID.
- Verified Eden owner with valid agreement can create separate PwnZ profile, keep Eden ownership private and read their own inbox.
- PwnZ-only account or expired agreement cannot open Light Conversations.
- Blocked person cannot initiate/send messages.
- Foreign member cannot read, delete or report another member's messages.
- Existing Light of Hope posts, identity records and payment protections remain unchanged.
- Moderation, account disabling, abusive posts, reporting, rate limits and deletion rights are verified.
- Test on the Firebase emulator with two real test accounts, then on protected Vercel preview before production merge.

## Repository handling
The current branch is based on the production `main` branch (after public PwnZ preview release) rather than the old conflicting PR #2. All Social+Messenger code is together. Do NOT merge the old PR #2 separately.

## Security update: private handle registry (2026-10-30)
- PwnZ draft Firestore rules now restrict reads of `pwnzProfiles/{uid}` to the owner and forbid profile listing.
- Handle registry reads are no longer public directory reads. Contact lookup through the browser must remain disabled until an authenticated, rate-limited trusted service has been implemented and tested.
- The current Messenger browser-side exact-handle search was written for the old public registry and WILL FAIL with these stricter rules. This is intentional fail-closed behavior; do not merge it unchanged as a working member search.
- Contact discovery must enforce membership eligibility, blocks, response minimization, and avoid revealing private UID mappings. Ordinary public posts might still reveal author UIDs; a full public-facing alias projection is required before claiming complete identity separation.
- Dedicated Light of Hope backend integration remains pending. No production or Firebase rules have been changed.

## Unified PwnZ V17 UX / account checklist (2026-10-30)
- Home now presents three large Social, Gaming and Creator doors and an obvious Join / Sign in action.
- Replaced inactive /profile placeholder with account / edit profile links to PwnZ Social.
- Social now includes a compact, scrollable PwnZ agreement that must be reaffirmed every 30 days. Its draft Firestore rules require a valid agreement for user writes. Agreement and write permissions must be emulator-tested before deployment.
- The secure backend flag `PWNZ_SOCIAL_BACKEND_ENABLED` remains deliberately OFF; client pages cannot yet create or read member accounts on the live service.
- PwnZ handle currently registers as an alias, but **username/password sign-in by handle is NOT implemented**. Email/password and existing Eden-credential sign-in are the only implemented authentication methods. Secure handle lookup requires a server-side resolver and anti-enumeration protections; never use a public email or UID registry.
- New PwnZ-only member direct messaging is NOT enabled: shared Messenger rules currently require an activated Eden RealID and existing Light of Hope agreement. Member-to-member PwnZ messages need a separate authorization model, abuse controls and server-side contact resolution.
- Do not merge until Firestore deployed rules are reconciled, emulator-tested for agreement expiry and two-account isolation, member lookup throttled, and real browser account creation/profile edit/posts and messaging pass.

## Two-path account policy finalized 2026-10-30
- Email/password only. Distinct visible choices: New/returning PwnZ Member, or Existing Eden RealID member. Both authenticate through the same underlying Firebase project. PwnZ handle is a public identity, not a login credential.
- Firebase browser auth persistence keeps a normal signed-in session until explicit signout or platform session invalidation; every 30-day agreement renewal gates community writes without deleting the login or account.
- PwnZ-only members sign the PwnZ 30-day agreement. Verified Eden RealID account owners with an active Light of Hope V16 agreement automatically qualify and must not sign a duplicate PwnZ agreement.
- Existing Eden users whose Light of Hope agreement has expired are directed to renew there; they cannot bypass it by signing a PwnZ-only agreement. All relevant write rules mirror this distinction.
- Before any release: combine the PwnZ candidate rules into the authoritative deployed Light of Hope Firebase rules, deploy composite indexes, emulator-test verified Eden/pure PwnZ/expired agreements, and provision controlled Firebase preview access. This GitHub rules file is not the deployed ruleset.
- PwnZ member-to-member messenger remains gated pending robust verified member directory, consent/block controls and appropriate rules for PwnZ-only accounts.

## Shared rules reconciliation (2026-10-30)
- PwnZ collections are now merged into `NickPwnZLegit/Light-of-hope-site` PR #41 candidate `security/v16-production-candidate.rules` without deleting existing LoH matches.
- Combined composite indexes staged in `security/v16-firestore-indexes.json`; this is not a live Firebase deployment.
- Added `security/pwnz-reconciled-firestore.test.mjs` and a Firebase emulator workflow job to verify PwnZ-only signup, Eden agreement inheritance, expired agreement bypass prevention, private profile isolation, post authorization and existing LoH message isolation.
- Fixed unclaimed handle checks and bounded 30-day PwnZ agreement validity.
- This phase does NOT yet enable PwnZ-only Messenger, public member search, or production social writes; those require further rules, consent/block enforcement, threat tests and explicit Firebase activation.
