# Hope Labs | Shared Media Gateway and PwnZ Arena Sandbox
**Research RFC — 19 November 2026**
**Status: OFFLINE DESIGN / REVIEW ONLY.** This document does not authorize public MP4 uploads, game-code execution, subscription billing, on-chain transactions, or any changes to live identity and account systems.

## Answer: one shared foundation, two different runtimes
An MP4/WebM video is **encoded audiovisual content**, not a game program. Playing it requires decoding, buffering, optionally transcoding, captions and a video player. A browser game requires an executable web build (JavaScript/WebAssembly), a graphics renderer (Canvas/WebGL/WebGPU where supported), input and audio, and for multiplayer a server-authoritative session. The same *upload gateway* can stage both but must never execute them as the same media type.

## Cross-network design
```text
             LIGHT OF HOPE / PWNZ (separate sessions & permissions)
                             |
                    Hope Media Gateway (planned)
         signed direct-to-private-object-storage uploads
         per-project quota, upload reservation, SHA256 and audit receipt
                  |
         immutable staging object + type-specific review
                    /                              \
              Video lane                       Game lane
      MP4/WebM, decoded codec,              ZIP/web-build manifest,
      real duration, malware scan,          decompression/ratio guard,
      content and rights review             malware/JS/Wasm static review,
                    |                       legal/creator approval
             human moderation                       |
                    |                       published version, distinct
        approved optimized video             untrusted game origin
          on Light of Hope                      PwnZ Arena sandbox
                                                    |
                                         optional authorized multiplayer
                                         separate authoritative game server
```

## What can genuinely be shared
1. Authenticated member/creator intake request with server-side eligibility verification. PwnZ must not trust Light of Hope browser state or assume a cross-domain login already works.
2. Upload grant scoped to an exact path, media type and bounded byte count, with server-owned reservation and anti-replay token. A file is staged privately, never made public immediately.
3. Storage usage, per-day/month quotas, deletion requests, expiry/retention, SHA256 evidence and a redacted administrator audit trail. Per-site quotas remain separate and enforceable server-side.
4. Moderation queue: pending, quarantined, rejected, approved, removed. Creator review and notification for every accepted submission; HI can summarize content and flags for a human; ANNEAL may supply anomalies but cannot grant publication, access or approval.
5. A reusable approval workflow and *policy library*, not a shared public-storage bucket, credential store, direct user data linkage or identity database.

## Separate video requirements (Light of Hope)
- Existing private staging candidate is currently **preview only and disabled on production**. Current policy proposes MP4/WebM, 30 seconds and 45 MiB; these are not a working public upload service.
- Client metadata or file extension is never proof of actual codec, duration, safety, or rights. Verify on trusted isolated processor, check malware/content, and provide accessible HTML5 playback only after administrator approval.
- No uploads through Vercel Function request bodies: use direct client-to-private-object storage with short-lived server grants. Current Vercel guidance includes function body-size limits; storage and processing costs still need measurement.
- If a person removes a video, unpublish immediately and asynchronously delete the original, derived renditions and thumbnails where retention rules allow. Track cleanup failures for retry.

## Separate game requirements (PwnZ)
- Accept **browser-targeted** original or properly licensed WebGL/WebAssembly web builds only. Traditional Windows executables, game ROMs and arbitrary source-code projects are not playable by an MP4 player. Server-side compilation of user-submitted projects would be a separate heavily isolated, explicitly approved build service, not an initial feature.
- First pilot is one OWNER-SUPPLIED, original, no-network game. Offline test packages are described by `research/gamePackageManifest.mjs` and are *never launched automatically*.
- All package contents are untrusted even if `validateGameManifest` succeeds. Inspect full extracted archive safely (reject ZIP bombs, traversal/symlinks, unexpected native executables), scan executable scripts/wasm, validate rights/asset inventory, and obtain human approval.
- Host approved immutable builds on a **separate origin** from PwnZ/Light of Hope. Use restrictive CSP, resource limits, narrow `postMessage` schema and sandboxed iframe as compatible with the game, with no credential-bearing cookies, access to Eden RealID, LightVault or social APIs. Never use `allow-same-origin` with an untrusted same-origin page. A browser's WASM sandbox alone does not guarantee that JavaScript glue, assets and host APIs are safe.
- Separate real-time authoritative multiplayer service for movement, matchmaking, anti-cheat and abuse control. Do not send per-frame simulation via a standard Vercel request handler.
- Server must verify game-play/subscription entitlements and role eligibility independently before issuing any launch ticket. Arena access is currently denied by default; paid subscriptions and tournaments are not live.
- Require exact rights to code **and** artwork/music/maps/trademarks. Being open-source or possessing old game files does not necessarily authorize commercial hosting.

## Proposed stages and release gates
**A. Research (current):** synthetic manifest policy + tests, storage taxonomy and threat model; no uploads or execution. 
**B. Private Light of Hope media preview:** isolated Firebase rules/emulator and private bucket; server-side actual duration/codec/malware/rights review; owner-only sample files. Public uploads remain disabled.
**C. PwnZ one-game local/offline demo:** original synthetic build with a separate isolated runner, simulated entitlement, in-browser controls and crash metrics. No member-submitted game code.
**D. Manual game-creator submissions:** role application, rights evidence, private staging, human approval, sandbox and adversarial test coverage, storage/compute billing caps, removal and abuse handling.
**E. Real PwnZ Arena launch:** reviewed server-side access/billing, robust multiplayer authority, game licensing and mobile acceptance. No presumption that every format or device will work.

## Evidence and rollback
Each candidate records repo, branch, pinned SHA, synthetic-only fixture, test logs, storage costs, browsers, devices, reviewer and rollback. In a security incident: disable new uploads, revoke launch tickets, remove public mapping, purge cached sessions, preserve minimal audit records. No biometric material, wallet keys, secrets, production identity records or gameplay code with unknown rights belongs in public research.

Reference baselines in this project: `ARENA-MODULE.md`, `docs/PWNZ-NETWORK-WHITEPAPER-v0.1.md`. Light of Hope draft intake policy: `server/mediaIntakePolicy.mjs` and `docs/V16_STORAGE_EMULATOR_GATE_2026-11-18.md`.
