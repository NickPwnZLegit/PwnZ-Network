# PwnZ × Hope Labs | Orbit Shield & local MP4 Lab V2

**Experimental research page:** `/arena-lab/` on the PR preview branch. Never treat it as the subscriber Arena or a validated game emulator.

This adds an original **browser-playable Canvas game** named Orbit Shield. Its sprites are generated geometry, not licensed franchise content. It uses deterministic simulated drones, movement, projectiles, collisions and an optional 60-second round. Controls: keyboard arrows/WASD + Space, or accessible touch buttons. It uses no WebAssembly or third-party ROM/game packages and has no networked multiplayer. A separate future WASM/WebGL runner needs independently reviewed isolated origin, content licensing, executable scanning, integrity checks and server-side authenticated game sessions.

The **local MP4/WebM research preview** reads only the first 16 bytes, compares container headers, loads a Blob URL in a local video element, and checks the browser's decoded metadata for a maximum of 30 seconds, dimensions and a 45 MiB file cap. Clicking Capture local frame draws a still to memory-only Canvas. Clear, changing file or leaving the page revokes the object URL. It does **not** upload, transcode, record, store, publish, automatically moderate, verify copyrights, or guarantee actual codec safety. Browsers can reject or misreport malformed media. Never point untrusted media to an unreviewed production pipeline.

## Evidence and limits

- `node --test research/hope-labs/media-arena-v2/*.test.mjs`: offline deterministic engine, media-metadata policy and static browser-boundary checks.
- `node research/hope-labs/media-arena-v2/bench_arena.mjs`: locally measured Node-only simulation cost, not real mobile device FPS.
- CSP denies all `connect-src` on the laboratory page. No Firebase, PwnZ account, live stream, game entitlement, token, wallet, prize or financial transaction is involved.
- The test suite does not prove browser compatibility until preview verification on current iOS Safari, Android Chrome and desktop browsers, including touch release, media decoding, screen-reader and reduced-motion behavior.
- Existing Eden RealID / ZK identity, 30-day agreements, subscriptions and game entitlement policy remain untouched. HI/ANNEAL cannot unlock uploads, games, identities, prizes, payments or moderation.

**Release decision:** research-only draft branch. Full uploads need server-controlled reservations, codec/duration decoding, malware and policy screening, private object storage, quotas, rate limits, user consent, reports/removal and deletion retention. Real multiplayer needs server-authoritative state, original/licensed game code and verified subscriptions. No production merge or public activation is authorized by a green unit test.
