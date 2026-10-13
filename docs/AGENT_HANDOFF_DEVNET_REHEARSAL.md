# Claude handoff — 2026-10-13

The code changes and a real devnet execution rehearsal are complete locally. Continue with the owner's wallet setup question and, when explicitly authorized, hosted deployment. This file records work and scope; PRODUCT.md and ROADMAP.md remain product authority.

## Start here

1. Read PRODUCT.md, docs/ROADMAP.md, then the relevant subsystem README and DESIGN.md, following AGENTS.md.
2. Inspect the current branch and working tree. Work is on `codex/devnet-demo`, based on the earlier `codex/plans-theatre` work. Nothing was pushed or deployed to the public site in this session.
3. Answer the owner's latest question: **“How do I connect the wallet? If I want to trade when I see an idea and a plan, how do I do it?”** Explain wallet connection, Google sign-in, devnet funding, Plans → Review trade → amount → Get quote → approve in wallet → verified receipt. Discover's public ideas never automatically become executable plans.
4. For desktop, use a regular browser with a Solana Wallet Standard extension. The Codex in-app browser has no wallet extension. For Phantom on a phone, open the site inside Phantom's browser; current Phantom docs say connection from mobile Safari/Chrome is unsupported. Enable Settings → Developer Settings → Testnet Mode → Solana Devnet. Use a dedicated test wallet and fund its own address with devnet SOL/USDC. The WSL creator key is not automatically an account in Phantom.
5. If the owner wants the fixes on `trade-relay.app`, obtain an explicit push/deployment instruction; AGENTS.md says not to push unless asked. Check the deployment/auto-deploy setup before deciding how to integrate the branch. Local Google callback settings must not be used unchanged on the hosted site.

Verified wallet references: [Phantom testnets](https://help.phantom.com/articles/use-testnets-in-phantom-5997313271699), [Phantom app connections](https://help.phantom.com/articles/29995498642195). A phone's `localhost` is the phone, not this PC; the local Vite URL is for this computer.

## User requests handled

- Plans curtains and audience should behave exactly like Discover.
- Discover ending glitched; mobile content and Interval controls were obstructed; desktop plan had excessive top margin.
- More plans: owner chose **both** real devnet plans and separate fictional demo scenarios. “Right time” was implemented as matching stated entry conditions, never a recommendation or promise of profit.
- Fix missing devnet Follow venue path, replace the short-lived test plan for recording, and verify an actual Google round trip.
- Owner chose the existing dedicated creator `HRJp…kp1e`.

## Commits (oldest first)

| Commit    | Result                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------- |
| `4ccdda6` | Shared feed curtains/audience; ending, mobile access and desktop centering fixes.                        |
| `b1043bb` | Validated devnet simulated venue routing, runtime availability and correct client devnet mint/allowlist. |
| `144c794` | Resumable owner-run venue/three-plan preparation; three fictional demo scenarios.                        |
| `a96de67` | Google callback state binding, no-cache/timeouts, truthful failed logout and readiness configuration.    |
| `d0110a5` | Real plan, funding, Google and receipt rehearsal evidence in the roadmap/runbook.                        |

## Code changes

**Theatre:** `app/src/components/theatre/{Audience,Curtain,useTheatreHouse,useFeedEnding}` and `drapes.ts` are shared by Plans and Discover. Ending closes over the last card rather than a blank sentinel; replay/focus and reduced-motion behavior are shared. Watch triggers applause; ending triggers cheering. Closed curtains make the feed inert. Desktop plans center above the audience. Phones use a compact identity and 64px audience; long plan content scrolls to its actions, and Interval controls stay reachable. `app/e2e/theatre.spec.ts` covers the regressions.

**Devnet execution:** `SIMULATED_VENUE_ADMIN` is one public address. `ChainReader.getVenuePool` validates the executable venue, pool owner/admin/mints/bump/decimals/positive price, and both initialized classic-token vaults from one confirmed snapshot. `server/src/modules/plans/follow.ts` builds the real venue route, checks liquidity/range and simulates before quoting. Existing verification re-reads the transaction/receipt from chain. `GET /follow/status` and `/health/ready.follow` report runtime availability. `domain/src/networks.ts` no longer has a static `swapsAvailable` switch. Client pair selection and transaction allowlist now use devnet; the old client selected local-fork/mainnet USDC. No Rust program change was required.

**Plan preparation:** `bun run --cwd server rehearse-devnet` is a public-only preview; `--publish --keypair <local file>` funds the venue and publishes three seven-day plans with explicit test text. Shared helpers are `server/src/shared/rehearsal.ts` and `rehearsal-send.ts`; instructions use Kit. Saved plan IDs/terms allow resuming without duplicate plans. Each transaction signature is journaled before submission. An uncertain transaction blocks new sends across all batch manifests for that creator until confirmed or expired. Funding tops up a target. New manifest paths create fresh batches after expiry; old history is preserved. Runbook: `docs/runbooks/DEVNET_REHEARSAL.md`.

**Fictional demo:** `/demo` offers Entry passes, Wait for the range, Return to the range. All use shared `entryStatus` and explicit button-driven time. No API, real watchlist, trade or receipt is created. This is separate from real Plans and from dev-only `/dev/plan-states` fixtures.

**Google:** Signed five-minute browser state cookies reject missing/mismatched/tampered/expired callbacks before Google exchange/session creation. Auth responses use no-store; provider requests time out. Failed sign-out retains the identity and provides retry feedback; pending profile responses cannot undo a successful logout. Readiness requires client ID, secret and redirect URI. Google gates the app's follow UI; server quote/program remain permissionless, as documented before this change. Watching and reading remain open.

## Real devnet proof

Creator/follower for this explicitly authorized test: `HRJpuCAo3bvBgUUSTbcqNRupR853yaQ1FMcXMkEikp1e`.

Relay program: `GyfA1Cfni44zwHc5FB9nxtmMRhnLv5YtTY1KZY5NsK6F`.

Venue program: `CvopiSHQabzQfWnEzhpaLwNRM5MbyGmhLe643NFSSp8K`.

Pool: `FdHKaJvkT1tkU2Qz5soV2aoJbN5sLPYSjTnKuHWikAJf`. Initialized both SOL/USDC vaults, funded 0.02 devnet SOL. Configured venue price is **100 USDC per SOL**, explicitly a test price, separate from the feed's reference market price.

| New test plan | Address                                        | Range   |
| ------------- | ---------------------------------------------- | ------- |
| In range      | `43EWbUwNkSeszwiDLSLa7rNtPWdFGU41Jks689kbn6nu` | 90–120  |
| Below range   | `DhY7wgdb6Uek85rKfKxVSn6rU3U5pPaq7ryaURxodkqD` | 130–150 |
| Entry passed  | `BV1xXxt2oEWiu3oRSzgPDgjh58YLXkktEust3XikWWiy` | 70–80   |

All have confirmed text hashes and expire **2026-10-19 23:33:07 UTC / Oct 20 03:33:07 Tbilisi**. The feed had four plans including original `AVRQgJHuTFvUhmgxhomH6amQk1LE6feTJKEcHw2Y4hWx`. Statuses were observed from actual reference prices; they are not pinned to these test-case labels.

The owner completed a real Google sign-in. Signed in was observed in Account and survived reload. No owner password/verification code was accessed by the agent.

The owner completed the Circle faucet request; 20 devnet USDC arrived at the creator. The owner explicitly selected that wallet for **one 1-USDC test follow**. A local CLI requested the actual server quote/simulation, composed with the shared domain client, signed locally and submitted; `/follow/verify` returned `recorded`:

- Signature: `21YdjU2VAa2f7UqUwS1D7eZiUJM9HD3V6wxZzYR2CQiKNxAU4tSnxa9UgPMuBJFNPJteawaQBAFLrqZfBdquEaPb`
- Receipt: `ErQ71Ehqitxej7XJ5cpMN14G9xETZoMQhehyjZCfumyb`
- Slot: `510432740`
- Spent: `1000000` USDC atomic units = 1 USDC.
- Received: `10000000` SOL atomic units = 0.01 SOL.
- [Real devnet transaction](https://explorer.solana.com/tx/21YdjU2VAa2f7UqUwS1D7eZiUJM9HD3V6wxZzYR2CQiKNxAU4tSnxa9UgPMuBJFNPJteawaQBAFLrqZfBdquEaPb?cluster=devnet).

Watchlist → Receipts, looking up the creator's public address, visibly showed Verified receipt, $1.00 spent, 0.01 SOL received and $100.00 entry price. The position estimate is explicitly labelled an estimate, not a verified result.

**This was an owner-authorized CLI signature using the same wallet as creator/follower. It was not a Wallet Standard popup rehearsal. No popup was faked.** That UI path still needs an actual extension/mobile wallet. The single authorized test trade is already complete; another trade needs a new owner instruction.

## Runtime, credentials and validation

- Windows/PowerShell, Bun. Repo: `C:\Users\HP\Desktop\Solana-Course-Project`.
- Local Vite: `http://localhost:5173`; local API: `http://localhost:3001`. They were left running. Last observed PIDs: Vite 26708, API 9536; inspect current ownership before restarting.
- Root ignored `.env` now has the public `SIMULATED_VENUE_ADMIN` above. API was restarted; `/follow/status` returned `available: true`. After the test swap, 0.01 SOL remains as pool token liquidity unless changed later.
- Runtime database is intentionally remote Neon. Preserve that choice. Never reset it for tests or print environment secrets. Local Docker/production services were not rebuilt or deployed by this follow-up.
- The user thought keys were under `~/relay-keypairs`; the actual dedicated creator file is **Ubuntu WSL `~/relay-keys/creator-devnet-keypair.json`**, user `georgeshani`. The agent used only that key after explicit authorization. Key contents were never printed/copied into repo. Default project owner-signing rule remains; this was an exception for the completed preparation and one test follow.
- Ignored `.relay/` contains the resumable batch/creator transaction journals, `follow-once.ts`, `follow-once.json` and `verified-follow.json`. They contain public rehearsal data, not key bytes. The session-only follow script rejects another automatic send once its journal exists; `--verify` is read-only verification. Preserve these journals; do not remove them to bypass an uncertain transaction.
- Devnet RPC returned 429 twice during setup. The journal allowed safe resumption. All setup/publication transactions were subsequently confirmed; the journals now have no pending setup signature.
- Final checks: **255 server tests, 170 app tests, lint, server/app type-check and production app build passed**. Earlier domain suite: 90 pass/type-check clean. Nine theatre browser regressions and three new demo/logout browser checks passed in installed Edge.
- Browser tests use `E2E_BROWSER_CHANNEL=msedge`; default Chrome is not installed. Use `--output=C:/Users/HP/.codex/tmp/<unique folder>` so tracked old `app/test-results` are not overwritten.
- An isolated test Postgres on port 5433 was created to avoid the owner's exhausted 5432 connection pool, then removed after tests. For new DB tests, create another isolated DB and set `TEST_DATABASE_URL`; do not assume the removed container still exists.
- No Rust source change, program rebuild or new Rust suite run in this follow-up. No physical iPhone Safari test. No hosted deployment, no push, and no PR created.

## Remaining work

- Help the owner set up and connect a devnet wallet in a supported browser and rehearse the actual wallet approval popup if requested.
- Deploy the tested branch to the hosted site only after explicit authorization to push/deploy. Hosted OAuth needs the registered `https://trade-relay.app/api/auth/google/callback`, `APP_ORIGIN=https://trade-relay.app`, and bare `DOMAIN=trade-relay.app`; local callback is `http://localhost:3001/auth/google/callback`.
- Check mobile UI in the real phone/browser after deployment. Existing automated small-screen checks passed, but they are not physical Safari proof.
- `program/README.md` still lists the old Relay program address near its top; actual Rust/client/IDL and the roadmap use the deployed address above. Correct that documentation in a scoped follow-up.

The owner values speed and gets frustrated by repeated permission questions. Continue already-authorized reversible work, use existing session answers, and keep progress updates short. Ask only for an actual missing decision or a required final authorization, with its specific source.
