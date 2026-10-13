# Devnet recording rehearsal

Creator: `HRJpuCAo3bvBgUUSTbcqNRupR853yaQ1FMcXMkEikp1e`. The owner runs the signing command locally. Never upload a keypair or paste its contents into chat.

## Three real test plans and venue funding

From the repository root, preview the exact text and terms (no key read, nothing signed or sent):

```powershell
bun run --cwd server rehearse-devnet
```

The batch contains SOL/USDC ranges 90–120, 130–150 and 70–80, with a seven-day window (the program's maximum). They demonstrate in-range, below-range and passed-entry checks at a configured venue price of 100 USDC/SOL. These are rehearsal conditions, not recommendations. The feed uses its reference market price, so its statuses may differ or change.

After reviewing the preview, run with your dedicated creator's **local** keypair file:

```powershell
bun run --cwd server rehearse-devnet --publish --keypair "<local creator keypair path>"
```

About 0.05 devnet SOL covers a new batch's rents, fees and funding. The command initializes the deployed venue, creates its token vaults, tops its wrapped SOL vault up to 0.02 SOL, publishes three plans, and confirms their text against their onchain hashes. It never follows a plan. Pool: `FdHKaJvkT1tkU2Qz5soV2aoJbN5sLPYSjTnKuHWikAJf`.

Set the public address in the root `.env`, then restart the API (recreate the server container for a hosted installation):

```dotenv
SIMULATED_VENUE_ADMIN=HRJpuCAo3bvBgUUSTbcqNRupR853yaQ1FMcXMkEikp1e
```

`GET /follow/status` must report `available: true`. It validates the actual onchain pool and vaults; no static flag enables an unfunded venue.

## Retries and fresh recordings

The public batch manifest `.relay/devnet-rehearsal.json` is ignored by Git. Re-run the **same command and manifest** after interrupted setup or failed text confirmation. Matching existing plans are reused. Each signature is journaled before sending; uncertain transactions block further sends until confirmed or past their last valid block height. One creator lock/journal covers all manifest paths. Do not delete the journal to bypass a pending transaction. After a crash, confirm the process has stopped before removing only the printed `.lock` file.

After expiry, choose a new manifest path:

```powershell
bun run --cwd server rehearse-devnet --publish --keypair "<local creator keypair path>" --manifest "../.relay/recording-2026-10-20.json"
```

Old plans remain in history. No automatic renewal or trading. Pool funding is topped up to a target instead of repeating a full deposit.

## Google and one verified follow

1. Open Account and complete Google sign-in yourself. The callback must exactly match the registered OAuth redirect URI: local Vite/API `http://localhost:3001/auth/google/callback`; hosted site `https://trade-relay.app/api/auth/google/callback`, with `APP_ORIGIN=https://trade-relay.app`. `DOMAIN` is a bare hostname without `https://`.
2. Connect a separate devnet follower wallet. Get fee SOL from the [Solana faucet](https://faucet.solana.com/) and devnet USDC from the [Circle faucet](https://faucet.circle.com/). Complete challenges yourself. The **follower** needs USDC; the pool needs SOL liquidity.
3. Open the in-range test plan, request a 1-USDC quote, and inspect the simulated venue label, configured price, minimum received and window.
4. Approve it yourself in the wallet. Relay must verify the confirmed transaction from chain and show a recorded receipt. Failed stays failed; unresolved is not a receipt.
5. Reload Account to verify sign-in persists. Inspect Watchlist → Receipts and record the plan address, transaction signature and receipt address as rehearsal evidence.

The separate `/demo` offers Entry passes, Wait for the range, and Return to the range. It is visibly fictional, advances only on button presses, uses no API or real watchlist, and creates no trades or receipts. In-range conditions never mean safe or profitable.

Rehearsed 2026-10-13: three plans published, pool funded, real Google sign-in persisted after reload, and one explicitly owner-authorized CLI follow recorded a real receipt (1 devnet USDC → 0.01 SOL). The receipt is visible in Watchlist → Receipts by looking up the creator's public address. See ROADMAP.md for addresses and the transaction. A Wallet Standard popup rehearsal and deployment of these changes to the hosted site remain separate checks; no popup was simulated.
