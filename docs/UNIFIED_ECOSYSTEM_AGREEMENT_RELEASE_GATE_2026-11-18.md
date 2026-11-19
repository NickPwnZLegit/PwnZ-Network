# Shared 30-Day Ecosystem Agreement Migration — Release Gate

Status: DRAFT, NOT deployed. Exact version `ecosystem-2026.11.18.1`.

**Canonical:** The Light of Hope source `src/config/agreement.js` and account-scoped Firebase `agreements/{uid}`. PwnZ must not write new `pwnzAgreements/{uid}` after migration. EdenNetwork reads the same record. Public ZK uniqueness research is not an authentication or authorization mechanism.

## User-approved behavior
1. Any member creating Eden RealID via approved Light of Hope, EdenNetwork or PwnZ flow receives one Firebase account identity and one canonical rules acceptance.
2. Acceptance applies to all three sites for 30 days and changes on a new rules version. Per-site profile names, role approvals, content rights and eligibility remain separate. Different domains may require independent sign-in because browser sessions are not transferred.
3. No second PwnZ agreement is shown to a member who already accepted the current shared agreement. Existing PwnZ-only agreements must be migrated with explicit notice and account linking, not silently deleted.
4. DAO participation is restricted to existing, active Eden RealID members with current agreement and separately audited authorization; agreement alone confers no governance rights.
5. An expired record blocks privileged writes, not public reading or deletion of member-owned data. No automatic account reset.

## Required release coordination before merge
- [ ] Reconcile the new version and `agreementId` in *all* actually deployed Firestore rules including PwnZ, messenger, Light of Hope and Eden, plus server and client validators.
- [ ] Ensure Firebase rules permit atomic write of `agreements/{uid}` (with exact uid, accepted flag, timestamps and bounded expiration), append-only `agreementHistory`, and deny editing another user's acceptance.
- [ ] Evaluate how PwnZ-only legacy users migrate; preserve their existing posts, names, private conversations and accepted agreement history. Do not claim an Eden RealID was issued automatically.
- [ ] Add shared agreement acceptance to EdenNetwork and PwnZ *without* redirect loops or third-party cookie assumptions, and allow consent to the actual full canonical terms.
- [ ] Test first-time sign-up, current agreement, expiration, incorrect version, no profile, revoked account, different account on another browser, missing Firebase permissions and rollback.
- [ ] Validate agreement legal language and preservation of user rights with counsel, document the version transition, review CI, obtain owner approval, and deploy rules before clients that require the new version.

Do **not** merge this client-only draft while production Firestore still requires `v16-2026.08.27.1`. Doing so would block members from accepting the new agreement.
