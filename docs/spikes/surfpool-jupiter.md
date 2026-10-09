# Spike: Jupiter swaps on a Surfpool mainnet fork

Phase 0 of [RELAY_IMPLEMENTATION_PLAN.md](../RELAY_IMPLEMENTATION_PLAN.md). Run on 2026-10-09.

## Result: **A′ (GO, with a restricted venue list)**

A real Jupiter `/build` swap lands on a Surfpool mainnet fork **only if routing is limited to venues that work on stale fork state**. With an unrestricted route, the swap fails. No fallback to `mock_swap` is needed.

## What was tested

| Step | Result |
|---|---|
| Start a mainnet fork: `surfpool start --network mainnet --no-tui --no-studio --no-deploy -y --ci` (WSL, Surfpool 1.5.0) | Works. The RPC is reachable from Windows at `http://127.0.0.1:8899`. |
| Fund a burner with 1000 USDC | Works with `surfnet_setTokenAccount(owner, mint, {amount}, tokenProgram)`. SOL for fees came from `requestAirdrop`. |
| Jupiter `GET api.jup.ag/swap/v2/build` **without an API key** | HTTP 200. The keyless tier worked for about 6 calls; its documented limit is 0.5 requests/s. |
| **Unrestricted** route (it chose `GoonFi V2`) | **Fails on the fork.** Simulation: `Custom(21)` (0x15) inside the GoonFi program. GoonFi is a private oracle-based AMM; the likely cause is stale fork state. |
| **Restricted** route: `dexes=Orca V2,Raydium CLMM,Meteora DLMM,Raydium` | **Lands.** USDC to SOL: 100 USDC became 0.906237946 SOL (route: Raydium CLMM, two hops), 116,202 compute units. USDC to JUP: 100 USDC became 275.299691 JUP (Meteora DLMM, Raydium CLMM), 116,291 compute units. |
| Offline size of `[compute budget, 2 ATA creates, begin, swap, finish]` with the real Relay account lists | SOL route: **971 bytes**. JUP route: **1,171 bytes**. Limit: 1,232. |
| `surfnet_timeTravel({absoluteTimestamp})` | The onchain Clock sysvar moved by exactly the requested 3,600 s. |

## Facts confirmed for later phases

- **Jupiter program ID:** the `swapInstruction` always came from `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`. The instruction was `RouteV2`. This confirms the `JUPITER_PROGRAM_IDS` entry for the program.
- **Instruction shape with `wrapAndUnwrapSol=false` and `destinationTokenAccount`:**
  - `computeBudgetInstructions`: 1 (a unit price only; no unit limit);
  - `setupInstructions`: 1 (`ATokenGPvb…`, the idempotent ATA create);
  - `swapInstruction`: 1;
  - `cleanupInstruction`: `null`;
  - `otherInstructions`: empty;
  - `tipInstruction`: `null`.
  - The plan's fail-closed rule (reject anything else) is satisfiable.
- **Address lookup tables:** one table came back in `addressesByLookupTableAddress`, and it was enough.
- **Venue labels are case sensitive.** The `dexes` allowlist and `excludeDexes` are mutually exclusive. A wrong label returns `400 No routes found`. Labels for the allowlist above come from `GET /swap/v2/program-id-to-label`.

## Findings that change the plan

1. **Fork mode needs a venue allowlist.** Add a `JUPITER_DEXES` setting, used only when `SOLANA_CLUSTER=localnet` (the fork). Mainnet routing stays unrestricted.
2. **Use chain time, not `Date.now()`, for demo plans.** The fork's Clock was **3,600 s ahead of wall-clock** before the time-travel test. This may be a side effect of an earlier `surfnet_timeTravel` probe with empty params; I did not confirm that. Either way, plan expiry and entry status in demo mode must use the chain's Clock (`getBlockTime` or the sysvar), not the server's wall clock.
3. **The JUP transaction is tight:** 1,171 of 1,232 bytes, a 61-byte margin. Tune `maxAccounts` in Phase 3, or keep the instructions sysvar out of the transaction by moving it into a small Relay-owned lookup table.
4. **Do not probe cheatcodes with empty params.** `surfnet_timeTravel` with empty params executed instead of rejecting.
5. **The burner key is local only.** It was generated fresh per run and never held mainnet funds.

## Not verified

- Real wallets (Phantom, Backpack) against the fork. Only a script-signed burner was used.
- Behavior after time travel for oracle-based venues (not needed: they are excluded).
- Whether the fork's mainnet datasource (the public RPC) keeps up under repeated runs. It worked for about 5 runs in a row.
- Whether the keyless Jupiter tier is still available later; plan for `JUPITER_API_KEY` as the documented path.

## Reproduce

```bash
# in WSL, from any scratch directory
surfpool start --network mainnet --no-tui --no-studio --no-deploy -y --ci

# on Windows, in a scratch directory that has @solana/web3.js@1.99 and @solana/spl-token installed
EXTRA_QS='&dexes=Orca%20V2,Raydium%20CLMM,Meteora%20DLMM,Raydium' bun surfpool-jupiter.spike.mjs
```

[`surfpool-jupiter.spike.mjs`](surfpool-jupiter.spike.mjs) is a throwaway script kept only for reproducibility. It is not part of any build.
