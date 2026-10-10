# Continue here (handoff for the next session)

Written 2026-10-10. This is the short, current "what to do next" for an agent that picks the work up, for example a cloud session. The full plan is `docs/RELAY_IMPLEMENTATION_PLAN.md` (read all of it, Stage 3 first); the product brief is `docs/RELAY_HANDOFF_2026-10-10.md`. If this page and the plan disagree, say so and ask.

## Read first, in this order

1. `AGENTS.md` (rules), then this page.
2. `docs/RELAY_IMPLEMENTATION_PLAN.md`: top "Owner amendment", then **Stage 3** at the end of section W, then the older phases for history.
3. `PRODUCT.md`, `DESIGN.md`, `docs/DEVNET_RELEASE.md`, `DEPLOYMENT.md`, `.env.example`.

## Decisions the owner has made (do not reopen)

- **Devnet only.** No mainnet anywhere, now or later. Settings: `NETWORK=devnet` (or `localnet` for automated tests). Anything else is refused. (The older plan text that mentions mainnet or a mainnet fork is history.)
- **One settings file:** the root `.env` (copy `.env.example`). No `server/.env`, no `app/.env.local`.
- **Hosting:** AWS EC2 with Docker Compose and Caddy (`DEPLOYMENT.md`). The agent creates no AWS resources.
- **The owner deploys the program** with their own keypair and holds all keys. The agent never asks for, reads or stores a key.
- **Trader data:** 2 to 3 owner-chosen traders; posts curated by hand and labelled "Manual coverage"; wallet activity from a provider as a labelled third-party estimate. Never invent traders, posts or identities.
- **UI rebuild waits for the owner's Figma design system** (link plus Figma connection authorized). Backend and style-agnostic frontend work do not wait.
- **Feed policy (default, owner has not objected):** an optional creator-wallet allowlist `CREATOR_ALLOWLIST`; other plans are reachable by direct link and marked unlisted.

## State of the repo

- Branch `feat/relay-continuation` (based on `main` at `b22b7ca`, the teammate's UI). Commits on it, oldest first: C0 (plan amendment), P1 (network config, RPC proxy), P2 (program review, `scripts/set-program-id.ts`), work plan, devnet-only change. Run `git log --oneline main..HEAD`.
- **Done:** C0, P1, P2 (review only), P3 (EC2 runbook), **W1** (redone in the cloud session on 2026-10-10; the local agent's worktree branch never reached the repository; see its Result note in the plan). Checks after W1: domain 65, server 121, app 62 tests, root lint, `tsc` and the app build pass.
- **In progress:** D1 part 1 (program `devnet` feature, the `simulated_venue` crate, the domain venue client; see the plan). Part 2 (server and app wiring, the owner's pool tool, docs) is not done. `bun run program:test` has not been run for it: the cloud session cannot build SBF programs.
- **Done (cont.):** **W2** (discovery tables, strict curation loader, read API; no real traders yet, `server/curation/curated.json` is empty) **W4** (`GET /discovery/changes` over event cursors) and **W5** (anonymous-session evidence requests, review only through `bun run --cwd server review`). Server 202, domain 90, app 62 tests.
- **Not started:** F1, F2, F3, W3, W6, W7, C-phase screens (the app does not call `/discovery` yet; that is the next big piece: Discover as an ideas feed, the idea timeline page, watching with cursors and "Since your last visit", the evidence request flow).
- **Cloud environment limits:** the cloud session's network policy blocks `api.devnet.solana.com` (add it under Network access > Allowed domains in the environment settings); there is no Docker daemon (a local Postgres 16 runs with `service postgresql start`, roles and databases `relay` and `relay_test`); Anchor and the Solana CLI (and so `cargo build-sbf`) are not installed and cannot be fetched there (release hosts return 403), so `program:build` and `program:test` cannot run. Native `cargo check`, `cargo test -p simulated_venue --lib` and `cargo test -p relay --test vectors` do run.
- **Figma:** the Figma plugin (MCP server and skills) was offered to the owner on 2026-10-10 and is not connected yet.
- Two files show as modified only because of line endings: `app/src/routeTree.gen.ts` and `server/test/follow.test.ts`. Do not commit them.

## Next steps, in order

### 1. W1: done

See the plan's W1 Result. Nothing left except running `check-network` against real devnet once the host is reachable.

### 2. D1: devnet program build and simulated swap venue (blocks following on devnet)

Why: devnet has no Jupiter and a different USDC mint, so plans cannot be created and follows cannot happen today (see `docs/DEVNET_RELEASE.md`).

- `program/programs/relay`: add a Cargo feature `devnet` (off by default). Under it: supported pair is wSOL / USDC `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (6 decimals), and the allowed swap program is the venue's ID instead of Jupiter's. Keep `constants.rs` as the only place addresses live.
- Venue: grow `program/programs/mock_swap` into a small pool program ("Simulated swap venue (devnet)"): a pool account with a price the owner sets, a vault for each token, a swap instruction that moves tokens between the follower's associated accounts and the vaults. It must have no authority over Relay.
- `domain`: make the asset list and pair list depend on the network (`NETWORKS`), generalize `assertSwapInstruction` and `composeFollowTx` (`domain/src/solana/follow-tx.ts`) to accept the venue's swap instruction.
- `server`: a venue quote service (replaces the Jupiter client when `NETWORK=devnet`); `GET /prices` still uses Jupiter's price API only as a reference for SOL (label it "reference price, devnet tokens have no value").
- `app`: TradePanel keeps working; it shows "Simulated swap venue" on devnet. Set `NETWORKS.devnet.swapsAvailable = true` only when this works end to end.
- Tests: reuse the adversarial suite (CPI wrapper, second wallet, extra signer, range edges) against the venue. `bun run program:test`.
- The owner funds the pool and deploys (`docs/DEVNET_RELEASE.md` checklist). Never ask for keys.
- Done when: on devnet one wallet publishes a plan, another follows, a receipt is recorded, visible on Solana Explorer.

### 3. F2 (part): publish composer

No UI can create a plan today. Build the composer (wallet signs `create_plan`, then call `POST /plans/:pda/confirm`). Use existing tokens; the redesign only restyles.

### 4. W2 to W5: discovery backend (needs the owner's 2 to 3 traders)

Tables for traders, trader links (with identity basis), source records, ideas, timeline events with a global sequence; a curation file and loader labelled manual coverage; `GET /discovery/traders`, `/discovery/traders/:id`, `/discovery/ideas/:id`; then wallet activity from a provider (see `docs/TRADER_DATA_SOURCES.md`); then `GET /discovery/changes` over event cursors; then evidence requests with an anonymous hashed session, no server-side fetching of submitted URLs, review by internal CLI only. Details and gates: brief sections 6 to 9 and 13, and the plan's C1 to C3.

### 5. W6, then W7 only if needed

Off-market fill check (plan section S) before any follower statistic is shown. Indexer only if sync cost or lag shows up.

### 6. F1, F3, F4, F5

UI audit at 390x844, a short phone and desktop (can start now); the design-system rebuild when the Figma link arrives; Playwright smoke test and accessibility pass; the integrated demonstration on devnet.

## Inputs still needed from the owner

1. The 2 to 3 traders: names, source links, and whether each agreed (blocks W2 onward).
2. Figma link, and the Figma connection authorized in the terminal with `/mcp` (blocks F3 only).
3. Confirm the feed allowlist default, and the creator wallet addresses to list.
4. Which UI screens bother them most (F1 starts there).
5. The domain name and the EC2 instance, when they want to deploy.

## Commands (from the repo root)

```bash
bun install
docker compose -f compose.dev.yaml up -d      # local Postgres (also create the test database: relay_test)
bun run lint                                  # includes the no-type-assertions rule
(cd domain && bun test && bunx tsc -p tsconfig.json)
(cd server && bun test && bunx tsc -p tsconfig.json)   # TEST_DATABASE_URL overrides the test database
(cd app && bun test && bunx tsc -b && bun run build)
bun run program:build && bun run program:test # Anchor, Rust 1.89, Solana CLI 3.x, Anchor 1.1.2; skip and say so if the tools are missing
DOMAIN=x.example docker compose config -q     # validates compose.yaml
```

Dev servers read the root `.env`: `bun run dev:server` (port 3001) and `bun run dev:app` (Vite proxies `/api` to it). A `502` on `/api/feed` means nothing listens on 3001.

## Rules and traps (learned the hard way)

- No `as X` or `as unknown as X`, ever (lint enforces it). A fake `fetch` in a test needs a narrow function type, not a cast.
- Format only the files you changed with `bunx prettier@3 --write <files>`; `cargo fmt` for Rust. Put formatting-only changes in their own commit.
- One commit per package, explicit pathspecs (`git commit -- <paths>`), message ends with the co-author line the session gives. Do not push or merge unless the owner asks.
- Money is integers (bigint). Never trust the client for amounts, prices or outcomes. A failed transaction stays failed.
- Fictional data is always visibly labelled. Labels are not ingestion: nothing shows "Public post" or "On-chain activity" unless data really feeds it.
- Never read or print `.env` values. Never sign anything with a key that holds real funds.
- Shell heredocs containing apostrophes can break in the Bash tool; write such files with the file-writing tool instead.
- Server tests reset their database: use your own (`relay_test_backend`) if another session runs tests at the same time.
- On Windows the Solana toolchain runs in WSL (`scripts/anchor.ts` handles it); on Linux it runs directly.
- Jupiter's keyless tier is about 0.5 requests a second; it has no devnet market.
- Update the plan (tick tasks, add a Result note) when a package finishes, and report at the end: what was built, branch and commit, files, checks and counts, what is manual versus automated, and what is left.
