# Hope Labs read-only adapter V1

**Not deployed. Not connected to live production services.** This is the shared, standalone synthetic adapter copied into three private/draft research branches. It can only accept explicitly supplied offline fixture events with the strict schema `{signal, count, synthetic:true}`; no network argument, UID, email, ZK timestamp, account key, wallet, IP, browser telemetry or biometric field is accepted as an event.

Contract: `hope-labs-readonly-aggregate-v1`. All three sites share the exact `EVENT_TYPES`, response shape and fail-closed `ADAPTER_RELEASE` flags. The module is **not imported from the production UI, auth, API or Firebase rules**, and it has no network or storage operations. Exported report is derived from local synthetic counts only. HI uses a simple deterministic count threshold, not a trained neural model. ANNEAL has no active trained inference. ZK outputs do not verify real people.

To test: `node --test research/hope-labs/readonly-adapter-v1/readonly-adapter-v1.test.mjs`.

## Upgrade gate
1. Independent product-specific security review of any future data provider, including authentication, consent, provenance, rate limits, retention, aggregation, reidentification risk and trusted server-side origin checks.
2. First repeat cross-repo contract tests on each main branch without enabling live connections.
3. Prove model benchmarking and held-out improvements before calling any experiment actual ANNEAL inference.
4. Obtain separate approval for read-only **aggregate** production adapter. Never send biometrics, identity mappings, private keys, secrets or production records to ANNEAL/HI.
5. Protect existing authorization: no AI identity or access decisions, no payout/transaction/governance control, no silent user tracking.
