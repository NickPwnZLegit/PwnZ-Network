# PwnZ Creator and Game Developer Workspace | Implementation Plan
**Status: after network auth, unified media, and Lightchain proposal reviews. No user-executed builds or unreviewed code uploads are live.**

## Why the current site needs more
The current `arena/index.html` is a roadmap/landing page, and `social/index.html` contains reviewed roles for Gamer and Game Creator applications. These are **not** an online development environment or a build/upload pipeline. Do not market it as one until tested.

## Target experience
A member signs into the **same Eden RealID identity backend** used by Light of Hope, and creates one unique **PwnZ Gamertag**. The gamer public name is separate from the Eden RealID and is part of future NFT profile-name categories; no NFT minting or transfer occurs now. An approved Game Developer can create a private project without exposing their Eden account ownership, register a title, invite team members, upload *original or properly licensed* source/assets, manage revisions, run isolated previews, request review, and publish an approved build to the Arena.

## Product components, sequenced
1. **Developer home:** Projects, version/status, team roles, asset usage, moderation status, build health and estimated storage/compute allowance. Approval is checked on a trusted server against the account UID and a reviewed role registry, never a client-supplied role flag.
2. **Project registry:** Unique project slug within approved namespace; owner and team grants scoped to each project. Private source does not appear in social feeds or public gamer cards.
3. **Content editor:** Browser-first support for JavaScript/TypeScript, WebGL/WASM projects, sprites, audio, scripts, license manifests and read-only previews. The roadmap should start from an original example game. Support is not implied for unlicensed emulated commercial titles.
4. **Asset storage:** Signed, authenticated resumable uploads, allowlisted MIME, content hashing, explicit quotas, private-by-default storage, clean metadata, virus/abuse scanning, reporting and verified retention/deletion. Charging for optional capacity requires independently reviewed checkout, billing disclosures and refunds.
5. **Build sandbox:** Queue untrusted user code in **isolated ephemeral workers** with no secret access, no internal network, no privileged filesystem, CPU/memory/time/egress limits. Store pinned build artifacts; do not execute arbitrary uploads inside the PwnZ Vercel serverless app or in ordinary public web pages.
6. **Player preview:** Sandbox iframe policy, content security policy, origin separation, no arbitrary external cookies or parent access. Desktop/mobile controls, latency metrics, deterministic rooms and time-limited preview links. Multiplayer authoritative servers and anti-cheat require separate architecture.
7. **Review and publish:** Author submits a build manifest/licensing attestation; moderators review assets and functionality; owner-controlled publish with rollback. ANNEAL may suggest anomalies, but cannot approve, promote, suspend or monetize games.
8. **Community integration:** Link approved game cards into PwnZ social profile, creator pages, Messenger and optional LightVault, without leaking account ownership. Premium Arena and tournaments remain independently gated until gaming works and subscription terms are approved.
9. **Future NFT museum:** Category `PwnZ Gamer Names` is distinct from `Eden RealID Name Heritage`; publishing games and Gamertag ownership are not transferred by moving NFTs.

## Initial backend collections to model (do not deploy until reviewed)
- `pwnzGameProjects/{projectId}` private metadata and owner UID.
- `pwnzGameProjectMembers/{projectId__memberUid}` role and invite status.
- `pwnzGameBuilds/{projectId__buildId}` immutable artifact hash, statuses `submitted|scanning|building|failed|ready|review|approved|retired`.
- `pwnzGamePublicCatalog/{projectId}` approved card only.
- Blob/Object storage: private source `gameSource/{owner}/{project}/{version}/`, separate public immutable `gamePublished/`.
All Firestore reads/writes need owner/team/role rules and **trusted server** for privileged build transitions.

## Implementation gates / tests
- [ ] Existing Eden login and PwnZ Gamertag creation work on mobile, desktop and second device; preserve old accounts.
- [ ] Final roles and billing rules reviewed; no developer role self-approval.
- [ ] Sandbox threat model and operational cost ceiling; no untrusted code executes in primary app.
- [ ] Private file upload with signed intents, quotas, content moderation, hashes, and deletions.
- [ ] One original sample browser game built and previewed with zero private credentials.
- [ ] 2-player rooms, latency and disconnect recovery if enabling multiplayer; mobile input verified.
- [ ] Safe publish/rollback of approved game builds; public catalog cannot list private drafts.
- [ ] Browser accessibility, moderation report handling, and licensing review.
- [ ] External Lightchain partnership/application proposal prepared first, then optional game-linked blockchain utility only after audited integrations.
