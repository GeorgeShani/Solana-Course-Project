# Relay program: devnet release

Prepared 2026-10-10 for the owner. Relay runs on Solana **devnet** only: test tokens with no value, and a free faucet. **The agent does not deploy, hold or ask for a funded key.** You run the deploy with your own keypair.

This is an internal review by the agent that wrote and tested the program. It is not an audit.

## Does the program need changes for devnet?

**Yes, one set of changes (package D1 in the plan), and no changes for the product brief.**

The program holds two lists of addresses that do not exist on devnet, so as it stands a plan cannot even be created there:

| What the program allows                                 | Today                             | On devnet (checked 2026-10-10)                                                                                                                                                     |
| ------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quote token                                             | USDC with the address `EPjF…Dt1v` | That address is an empty account, not a token. Devnet's USDC is `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (6 decimals, classic token program; Circle's faucet gives it away). |
| Base tokens                                             | wSOL and JUP                      | wSOL exists (same address everywhere). JUP does not exist on devnet.                                                                                                               |
| Swap program between `begin_follow` and `finish_follow` | Jupiter's `JUP6…TV4`              | That address is an empty account on devnet: Jupiter has no devnet deployment, so there is nothing to route through.                                                                |

D1 adds a build for devnet with devnet addresses and a **simulated swap venue** (a small pool program we write and deploy on devnet, labelled as simulated everywhere). The follow rules themselves (top-level only, exactly one swap signed by the follower, balances measured before and after) do not change.

The brief itself (public-source discovery, timelines, the changes inbox, evidence requests) is off-chain and needs no program change. Exit receipts stay a later phase.

## What was reviewed

Every instruction and helper in `program/programs/relay/src` was read: `create_plan`, `revise_plan`, `close_plan`, `begin_follow`, `finish_follow`, `layout`, `terms`, `commitment`, `state`, `constants`, `error`, `events`.

| Area                  | Result                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signers and ownership | `create_plan`, `revise_plan` and `close_plan` need the creator to sign, and `has_one = creator` stops a different key from editing another's plan. `begin_follow` and `finish_follow` need the follower. All program accounts are `Account<T>`, so owner and discriminator are checked.                                                                                                                  |
| PDA seeds             | Plan, version and receipt addresses are derived from fixed seeds plus the plan, version number, follower and nonce. A receipt cannot be created twice for the same nonce (`init`).                                                                                                                                                                                                                       |
| Append-only history   | No instruction writes to or closes a `PlanVersion`. A revision chains on the previous `terms_hash`. The pair (mints) cannot change after creation. Up to 16 versions per plan.                                                                                                                                                                                                                           |
| Terms and time        | `0 < low <= high`; the window must stay open between 1 minute and 7 days at publish time; expiry is exclusive. All time arithmetic is checked.                                                                                                                                                                                                                                                           |
| Hash                  | The program computes `terms_hash` itself; the shared vectors prove TypeScript and Rust agree (2 vector tests). The vectors use a placeholder program ID, so a new program ID changes no vector.                                                                                                                                                                                                          |
| Follow layout         | Both follow instructions must be top-level (stack height check). The transaction must contain exactly one `begin_follow` and one `finish_follow`, `finish_follow` exactly two instructions later naming the same receipt and follower, and exactly one swap instruction between them from the allowed swap program, signed only by the follower and touching the follower's own base and quote accounts. |
| Token accounts        | Only the follower's associated token accounts (address derived, classic SPL Token only; Token-2022 rejected by type).                                                                                                                                                                                                                                                                                    |
| Measurement           | Output and spend are measured from real balance changes with `checked_sub`; the price check uses u128 cross-multiplication with no rounding at the bounds; the follower's approved maximum spend is enforced.                                                                                                                                                                                            |
| Failure               | Any failed check reverts the whole transaction, including the swap, so a receipt exists only for an in-range swap.                                                                                                                                                                                                                                                                                       |

**Tests:** `bun run program:test` on 2026-10-10 passed 45 Rust tests (24 follow, 19 plan lifecycle, 2 vectors), including a CPI wrapper, a second wallet swapping into the follower's account, an extra signer, plain-transfer fakes and the exact range boundaries.

**Result:** no exploitable defect found by this review and these tests.

## Risks that remain

1. **The upgrade authority can change the rules.** Followers sign inside the program's transaction, so a program upgrade could in principle misuse that. On devnet no real value is at stake, but keep the upgrade key safe anyway: it is the habit you want before anything real exists.
2. **A staged fill can pass the onchain check.** A user can swap through a pool they control at an in-range price; the program sees real balance changes and records a receipt. With the simulated venue this is even easier to do on purpose. Plan section S says to detect it off chain; **that check is not built. Do not show follower counts, medians or "creator observed entry" until it is.**
3. **Cost to users (test SOL).** Each follow creates a receipt account that is never closed (about 0.0019 SOL of rent), and a plan costs its creator about 0.0039 SOL. These are devnet SOL, so free, but the review panel should still show them.
4. **Anyone can create plans.** The server only lists plans from the creator allowlist once W1 lands; spam plans can still exist on chain.
5. **Validator clock.** Expiry uses the cluster clock, which can differ from the wall clock by a few seconds.
6. **No external audit.**

## The program keypair

The current program ID (`Dzm5tgMCdhJZfXeHYuALst4hvZYiCebfyKf1ctx6WBF6`) comes from a keypair created on a development machine. Make a **fresh keypair** for the devnet deployment and keep the file outside the repository (`.gitignore` already ignores `*-keypair.json`, but a copy inside the repo is still a risk).

## Owner checklist (after D1 lands)

Do these on your machine, in WSL (Anchor and the Solana CLI run there).

1. **Create the program keypair** and note its address:
   ```bash
   solana-keygen new -o relay-devnet-keypair.json
   solana address -k relay-devnet-keypair.json
   ```
2. **Point the repo at it** (text edits only; the script never reads the keypair):
   ```bash
   bun run scripts/set-program-id.ts <the address>
   bun run program:build
   bun run sync-idl
   ```
3. **Test with the new ID:** `bun run program:test`, then the domain, server and app test suites. All must pass.
4. **Get devnet SOL** for a deployer wallet (about 2 SOL for the program's rent; free):
   ```bash
   solana config set --url devnet
   solana airdrop 2        # repeat, or use https://faucet.solana.com if rate limited
   ```
5. **Deploy:**
   ```bash
   solana program deploy program/target/deploy/relay.so \
     --program-id relay-devnet-keypair.json --url devnet
   ```
6. **Check it:** `solana program show <program address> --url devnet`, and open it on Solana Explorer with `?cluster=devnet`.
7. **Start the stack** with `NETWORK=devnet` in `.env`. The feed stays empty until a plan exists.
8. **Smoke test:** create one plan from a creator wallet, open its record page, follow it with a second wallet using devnet USDC (get some from Circle's faucet), and confirm the receipt on the explorer. Then try to follow after the plan expires and confirm it is refused.

## Freezing

The upgrade authority can close the program, which stops all follows and plan changes; existing accounts stay on chain and readable but cannot be written. On devnet this is harmless, and devnet itself may be reset by Solana at any time, so never treat devnet data as permanent.
