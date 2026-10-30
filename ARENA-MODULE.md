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
