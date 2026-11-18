# Eden RealID and PwnZ gamer-name identity contract | 2026-11-18

Status: **preview integration, not validated production SSO or real human personhood.**

## Canonical model
- Light of Hope manages a single Eden RealID registration namespace and transactional user-owner lock in Firestore.
- EdenNetwork requests new Eden RealIDs from that SAME registrar. No separate username table may issue a duplicate Eden name.
- PwnZ requests Eden registration through a preview-only authenticated same-project gateway, then creates a **second distinct PwnZ gamer handle** via its transactional `pwnzHandles/{normalizedHandle}` document and matching private/public PwnZ profiles.
- The same verified Firebase account UID must own the Eden RealID and PwnZ handle. Different Firebase projects MUST NOT be treated as one account merely because email addresses match.
- Light of Hope doesn't generate PwnZ handles. EdenNetwork doesn't generate PwnZ handles. Members may have their own public gamer name alongside one Eden RealID.
- Existing PwnZ-only profiles and name locks are retained pending an individually reviewed migration. Sign-in is not deleted or overwritten; **new** PwnZ profile creation requires a verified Eden account and the current agreement.
- Signing in on one domain does not automatically sign in on other domains. Shared account credentials work only on the same verified Firebase project. An audited short-lived SSO exchange is a **future** separate release gate.

## Creation flow
1. Existing ecosystem member chooses "Existing Eden" and signs in with existing email/password. Review private `edenRealIdOwners/{uid}`, active profile and current agreement.
2. New member chooses "Create PwnZ/Eden account"; Firebase creates one UID on the shared Auth project. If account creation succeeds but name reservation fails, maintain recoverable session. Do not create duplicate email accounts.
3. A bearer-authenticated, server-side request asks the existing Light of Hope registrar to check and reserve/activate the desired Eden RealID.
4. Member accepts the current Light of Hope ecosystem agreement; for a new user, PwnZ profile reservation remains blocked until the agreement is current.
5. Reserve a unique 3–24-char PwnZ public gamer name in one Firestore transaction, protected by the matching `pwnzHandles` lock and `pwnzProfiles` record.
6. PwnZ media/community roles depend on separate access permissions. Gamer application approval and Arena subscriptions are not automatic.
7. Existing legacy PwnZ-only users sign in under their old profile and agreement, but create no **new** gamer name until Eden is linked. Migration needs recovery and duplicate-handling review.

## Future NFT name utilities (NOT deployed)
- Eden RealID and PwnZ profile handles are separate permanent namespaces and **not automatically minted as NFTs**.
- Future PwnZ handles may become category-tagged NFT profile-name assets, linked in an opt-in LightVault NFT Museum. Future collections may include Eden RealID Profile Names, PwnZ Gamer Names, Community Titles, and Event/Achievement NFTs.
- NFTs may point to **public names or revocable account-controlled aliases only**. Never mint a user's private account UID, biometric template, legal identity, private uniqueness credential or recovery data.
- Names cannot transfer or be sold until audited registry ownership changes, consent, wallet recovery, conflict handling, revocation, marketplace contracts, escrow/fees, and counsel review.
- Account recovery must not depend solely on NFT possession. A member must retain at least one securely recoverable Eden RealID.
- ANNEAL cannot issue, sell, recover, revoke or assign these names and never decides uniqueness.

## Test and deployment gates
- [ ] Compare actual Firebase project IDs from Vercel WITHOUT printing credentials; verify shared Auth project, authorised domains, rules and test-only users.
- [ ] Deploy reviewed composite Firestore rules with duplicate PwnZ handle and separate Eden owner lock tests in emulator.
- [ ] Test new, existing, legacy, interrupted, disabled, password reset, signed-out, mobile, and multi-device flows.
- [ ] Test actual same-Firebase sign-in at all three hosts; ensure independent browser sessions are expected, not promised SSO.
- [ ] Enable `PWNZ_EDEN_REGISTRY_ENABLED` only for preview with `EDEN_SHARED_FIREBASE_PROJECT_ID` matching `PWNZ_FIREBASE_PROJECT_ID`.
- [ ] Never publish account-to-human mapping or ZK metadata; no live human uniqueness claims.
- [ ] Obtain owner approval before any production release.
