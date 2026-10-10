# Relay program: mainnet release

Prepared 2026-10-10 for the owner. **The agent does not deploy, hold or ask for a funded key.** You run the deploy with your own keys, after reading this page.

This is an internal review by the agent that wrote and tested the program. It is not an audit and does not replace one.

## Does the 2026-10-10 brief need program changes?

No. The brief's discovery work (sources, timelines, change inbox, evidence requests) is off-chain and adds no transactions. It forbids staking, escrow and reviewer payouts for this release, and exit receipts stay a later phase. The program that was tested on the fork is the program to release, with one new program ID.

Changes that would need a program change, and why they are not made now:

| Idea                                        | Why not now                                                                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Exit receipts (realized results)            | A later phase (13). It adds new instructions and a new account type, which an upgrade can do without touching existing accounts. |
| Reserved padding in accounts                | Would change the account sizes, the hand-written codecs and every test, to avoid a problem that new account types already solve. |
| Closing receipts or plans to refund rent    | Receipts and plans are the history the product is about. Closing them would erase it.                                            |
| Onchain check that a fill is "market price" | Not possible on chain (see risk 3). It is detected off-chain.                                                                    |

## What was reviewed

Every instruction and helper in `program/programs/relay/src` was read: `create_plan`, `revise_plan`, `close_plan`, `begin_follow`, `finish_follow`, `layout`, `terms`, `commitment`, `state`, `constants`, `error`, `events`.

| Area                  | Result                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signers and ownership | `create_plan`, `revise_plan` and `close_plan` need the creator to sign, and `has_one = creator` stops a different key from editing another's plan. `begin_follow` and `finish_follow` need the follower. All program accounts are `Account<T>`, so owner and discriminator are checked.                                                                                                        |
| PDA seeds             | Plan, version and receipt addresses are derived from fixed seeds plus the plan, version number, follower and nonce. A receipt cannot be created twice for the same nonce (`init`).                                                                                                                                                                                                             |
| Append-only history   | No instruction writes to or closes a `PlanVersion`. A revision chains on the previous `terms_hash`. The pair (mints) cannot change after creation. Up to 16 versions per plan.                                                                                                                                                                                                                 |
| Terms and time        | `0 < low <= high`; the window must stay open between 1 minute and 7 days at publish time; expiry is exclusive. All time arithmetic is checked.                                                                                                                                                                                                                                                 |
| Hash                  | The program computes `terms_hash` itself; the shared vectors prove TypeScript and Rust agree (2 vector tests). The vectors use a placeholder program ID, so a new program ID changes no vector.                                                                                                                                                                                                |
| Follow layout         | Both follow instructions must be top-level (stack height check). The transaction must contain exactly one `begin_follow` and one `finish_follow`, `finish_follow` exactly two instructions later naming the same receipt and follower, and exactly one instruction between them from the Jupiter program, signed only by the follower and touching the follower's own base and quote accounts. |
| Token accounts        | Only the follower's associated token accounts (address derived, classic SPL Token only; Token-2022 rejected by type).                                                                                                                                                                                                                                                                          |
| Measurement           | Output and spend are measured from real balance changes with `checked_sub`; the price check uses u128 cross-multiplication with no rounding at the bounds; the follower's approved maximum spend is enforced.                                                                                                                                                                                  |
| Failure               | Any failed check reverts the whole transaction, including the swap, so a receipt exists only for an in-range swap.                                                                                                                                                                                                                                                                             |

**Tests:** `bun run program:test` on 2026-10-10 passed 45 Rust tests (24 follow, 19 plan lifecycle, 2 vectors), including a CPI wrapper, a second wallet swapping into the follower's account, an extra signer, plain-transfer fakes and the exact range boundaries. Earlier live runs on a mainnet fork recorded real follows through real Jupiter routes (857 to 1014 of 1232 bytes).

**Result:** no exploitable defect found. That means none was found by this review and these tests.

## Mainnet constants (checked 2026-10-10)

| Constant                         | Value                                          | How it was checked                                                                                                                                                                                                          |
| -------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jupiter swap program             | `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`  | A live, read-only call to `https://api.jup.ag/swap/v2/build` for 100 USDC to SOL returned this as `swapInstruction.programId`. Setup used only the associated token account program; no tip, other or cleanup instructions. |
| USDC                             | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | The mint Jupiter quoted against.                                                                                                                                                                                            |
| wSOL                             | `So11111111111111111111111111111111111111112`  | Standard native mint.                                                                                                                                                                                                       |
| JUP                              | `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`  | Not re-checked in this pass. Confirm on an explorer before a JUP plan is created.                                                                                                                                           |
| Associated token account program | `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` | Appears in the live setup instructions.                                                                                                                                                                                     |

## Risks that remain (read these before you deploy)

1. **The upgrade authority can change the rules.** `begin_follow` and `finish_follow` run with the follower as a signer. Whoever holds the upgrade authority could ship a program that takes a follower's funds inside that transaction, so followers trust that key. Put it on a **Squads multisig** straight after the deploy, never leave it on a laptop key, and tell users who holds it.
2. **Do not make the program immutable yet.** The Jupiter program ID is a constant. If Jupiter ever routes through a new program, follows stop working until the program is upgraded. Consider immutability only after the pilot.
3. **A staged fill can pass the onchain check.** A user can route a swap through a pool they control at an in-range price. The program sees real balance changes and records a receipt. Plan section S says to detect this off chain (compare with the reference price at that slot, flag it, exclude it). **That check is not built yet. Do not show follower counts, medians or "creator observed entry" until it is.** The record page currently says follower results are not shown.
4. **Cost to users.** Each follow creates a receipt account that is never closed: about 0.0019 SOL of rent per follow, paid by the follower, plus network fees. A creator pays about 0.0039 SOL for a plan's first version and 0.0021 SOL per revision. The review panel should show the receipt rent before signing.
5. **Anyone can create plans.** Creating one costs only rent. The server only lists plans whose text it has confirmed, and the feed is ranked by the server, but spam plans can exist on chain.
6. **Validator clock.** Expiry uses the cluster clock, which can differ from the wall clock by a few seconds.
7. **No external audit.** An independent review before significant volume is strongly recommended. This page is not one.

## The program keypair

The current program ID (`Dzm5tgMCdhJZfXeHYuALst4hvZYiCebfyKf1ctx6WBF6`) comes from a keypair that was created on a development machine and is stored in `program/target/deploy/`. **Use a fresh keypair for mainnet**, created on a machine you trust, and keep it offline once the deploy is done. The keypair decides the program's address; it is not the upgrade authority after you transfer that.

## Owner checklist

Do these on your machine, in WSL (Anchor and the Solana CLI run there). The agent can run the build and test steps (1 to 3) if you ask; steps 4 onwards need your keys.

1. **Create the program keypair** and note its address:
   ```bash
   solana-keygen new -o relay-mainnet-keypair.json
   solana address -k relay-mainnet-keypair.json
   ```
   Store the file outside the repository folder. `.gitignore` already ignores `*-keypair.json`, but a backup copy inside the repo is still a risk.
2. **Point the repo at it** (text edits only, the script never reads the keypair):
   ```bash
   bun run scripts/set-program-id.ts <the address>
   bun run program:build
   bun run sync-idl
   ```
3. **Test with the new ID:** `bun run program:test`, then `(cd domain && bun test)`, `(cd server && bun test)`, `(cd app && bun test)`. All must pass.
4. **Verifiable build** (needs Docker running; this is what lets anyone check the deployed program matches this source): `solana-verify build` in `program/` (install with `cargo install solana-verify`), or `anchor build --verifiable`. Record the hash it prints.
   - For reference only, the ordinary local build on 2026-10-10 is 265,728 bytes with SHA-256 `f8e4d53ccd85e0ff29ca499a107d1de848a8ac008bf1c8d3fc809ec10e1a4759`. A different build machine or ID gives a different hash, so use the verifiable build's hash.
5. **Fund a deployer wallet** (a new wallet used only for this): the program is 265,728 bytes, so about **1.85 SOL** stays locked as rent for the program data. Deploying uses a temporary buffer of the same size, so have about **4 SOL** in the wallet during the deploy. Most of it is refunded. If you may grow the program in later upgrades, deploy with a larger `--max-len` (rent grows with it).
6. **Deploy** (use a dedicated RPC provider URL, not the public endpoint):
   ```bash
   solana program deploy program/target/deploy/relay.so \
     --program-id relay-mainnet-keypair.json \
     --keypair <deployer keypair> --url <your mainnet RPC>
   ```
7. **Move the upgrade authority to a Squads multisig** (create the multisig at squads.xyz first):
   ```bash
   solana program set-upgrade-authority <program address> \
     --new-upgrade-authority <multisig vault address> \
     --keypair <deployer keypair> --url <your mainnet RPC>
   ```
8. **Verify the deployment:** `solana program show <program address>` must show the multisig as authority, and `solana-verify verify-from-repo` (or `solana-verify get-program-hash`) must match the verifiable build hash from step 4.
9. **Switch the stack on:** put the same ID in the app by rebuilding (it reads the IDL), set `SOLANA_RPC_URL` and the other values in `.env` (see `.env.example`), and start Compose. `GET /feed` stays empty until a plan exists.
10. **Smoke test with a small amount from a wallet you control:** create one plan from a creator wallet, open its record page, follow it with a small USDC amount, confirm the receipt on an explorer, and check it appears under History. Then try to follow after the plan expires and confirm it is refused.

## Rollback and freeze

- Until the program is made immutable, the multisig can upgrade it to a fixed version.
- A program can be **closed** by its authority. That stops all follows and plan changes; existing plan, version and receipt accounts stay on chain and readable, but nothing can write to them any more, and the program ID cannot be reused. Decide with your multisig signers in advance who may do this and when.
- The app can be pointed away from the program at any time by removing the follow panel; plans and receipts on chain stay as they are.
