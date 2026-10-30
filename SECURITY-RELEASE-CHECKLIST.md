# Combined Social + Messenger release gate
Date: 2026-10-30
Status: PREVIEW ONLY. Not safe to merge to production until conditions below pass.

## Firebase Console: manual owner steps
1. Open Firebase Console (console.firebase.google.com) and select the **same project** already used by Light of Hope. Do not create a second Firebase project.
2. Under Authentication > Settings > Authorized domains, check/add `pwnz.live`, `www.pwnz.live` and the specific Vercel preview host used in testing. Firebase sign-in provider configuration must already permit the intended account path; enable Email/Password only if you deliberately approve email registration. Do not enable anonymous auth or unreviewed OAuth providers.
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
