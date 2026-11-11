# PwnZ token migration to Lightchain AI · November 11, 2026

Status: approved roadmap direction, not a deployed token or automatic swap.

- The original PWNZ contract shown in the owner-provided Minted screenshots was created on Cronos at `0x754c77b8ceefc8747b8cd75b46d85afe35951dda`. The contract must be independently verified before recording balances, snapshot dates, allocations or vesting.
- Next PWNZ ERC-20 target: Lightchain AI Testnet (chain ID `8200`), then independently approved Mainnet (chain ID `9200`). No canonical Lightchain PWNZ contract address exists in this repository.
- HOPE utility and EDEN governance are also proposed Lightchain assets; END / ENDER is independent reserve/settlement **research only**. The original LOH community meme token remains on Cronos Launch; it is not a Lightchain bridge token.
- PwnZ gamers/creators retain social access regardless of token migrations. Eden RealID account linking and gaming identity are not equivalent to holding PWNZ.
- Before production: verify official chain RPC, ERC-20 code, decimals/supply, ownership, minter permissions, wallet compatibility, chain explorer and authentic migration rules. Avoid double crediting legacy and replacement tokens. No automatic real-money transfer, trading, staking or prize rewards.
- Candidate cross-platform pairs: HOPE/PWNZ, PWNZ/EDEN and PWNZ/USDC are research only. The Light of Hope core proposal is USDC/HOPE and HOPE/EDEN, not active liquidity.
- Deployments and any burn/lock/snapshot migration need separate formal owner sign-off and security review. Do not publish seed phrases or wallet private keys in any repo or website.

Official Lightchain docs:
- https://docs.lightchain.ai/docs/getting-started/testnet/connect-to-testnet
- https://docs.lightchain.ai/docs/getting-started/mainnet/mainnet-overview

Current Light of Hope source of ecosystem truth: `NickPwnZLegit/Light-of-hope-site/src/config/chainRegistry.js`.
