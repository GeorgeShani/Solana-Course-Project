# Relay — Product & Implementation Plan

> **When this plan is approved:**
>
> - The **full text of this plan, word for word**, is copied into `docs/RELAY_IMPLEMENTATION_PLAN.md` as a backup copy that lives in the repo.
> - One row is added to the table in `docs/README.md`.
> - Nothing else changes, and no application code is written until Phase 0 starts.
>
> **How to check the saved document:**
>
> - It renders on GitHub, including its tables and code blocks.
> - Every file path it cites exists, or is marked "(new)".
> - `git status` shows only those two files changed.

## Context

`Solana-Course-Project` is a template that deliberately commits to no idea. It has:

- a TanStack Start (SSR) frontend in `app/`;
- an "optional" Hono/Bun server in `server/`;
- an Anchor 1.1 workspace in `program/`, still containing the template counter;
- WSL helper scripts in `scripts/`;
- Docker Compose with Caddy for deployment on one origin.

The chosen idea is **Relay**, a mobile-first feed of creator trade plans that answers one question: _"Is this trade idea still available to me, and what happened after people actually followed it?"_

An earlier Next.js prototype (`C:\Users\HP\Desktop\curtain-sol`) explored the product. Its domain thinking, guardrails and tests are worth porting. Its stack, its gated home-screen flow (lobby, Stories-style horizontal navigation) and its JSON hashing are not. Its theatre visual identity stays, recolored in Solana colors.

**Decisions made with the project owner (2026-10-09):**

| Decision                   | Choice                                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where real swaps are shown | **Surfpool mainnet fork.** Surfpool is a local validator that copies mainnet accounts on demand, so Jupiter routes are real but no real money is used. A 2-hour spike must confirm this works, with a fallback ready. |
| Database                   | **Postgres**, as a new Compose service.                                                                                                                                                                               |
| Server role                | **Hono becomes required.** Update the docs that call it optional. The app shows an explicit "service unavailable" state when `/api` is down.                                                                          |
| Horizon                    | **A demo in about 3 days.** The plan contains a 72-hour demo cut (W/X) inside a longer MVP roadmap.                                                                                                                   |
| Visual identity            | **The prototype's theatre identity (curtain, marquee, spotlight, stage), recolored in Solana colors.** The interaction is still the vertical feed. Spectacle frames the data and never decorates it (section G).      |
| Solana SDK                 | **`@solana/kit`** (owner decision during Phase 3). `@solana/web3.js` v1 and the Anchor TypeScript client are not used.                                                                                                |
| Delivery shape             | **Small phases, each with one focus.** Stage 1 is Phases 0–9 (the 72-hour demo). Stage 2 is Phases 10–18 (the post-demo MVP). Details are in section W.                                                               |

### Phase overview

| Phase | Focus                                                                                 | Estimate | Depends on |
| ----- | ------------------------------------------------------------------------------------- | -------- | ---------- |
| 0     | Spike: Jupiter on Surfpool fork, go/no-go                                             | 3 h      | —          |
| 1     | Shared `domain/` package (math, hashes, entry status)                                 | 4 h      | —          |
| 2     | Program: plan commitments and versions                                                | 4 h      | 1          |
| 3     | Program: verified follow receipts + adversarial tests                                 | 6 h      | 0, 2       |
| 4     | Backend foundation: Postgres, confirm, prices, feed                                   | 6 h      | 1, 2       |
| 5     | Backend follow flow: quote, simulate, verify                                          | 4 h      | 3, 4       |
| 6     | Frontend foundation: Solana-theatre design, feed, cards                               | 10 h     | 4          |
| 7     | Frontend flows: details, publish, review, My Plans, plan page                         | 12 h     | 5, 6       |
| 8     | Demo slice: comparison, blocked attempts, expiry                                      | 8 h      | 7          |
| 9     | Hardening and rehearsal                                                               | 8 h      | 8          |
| 10–18 | Post-demo MVP: sign-in, indexing, exits, metrics, sync, mainnet readiness, onboarding | —        | Stage 1    |

---

## A. What I inspected

**Repository (all of it was read, not inferred):**

- **Root and deployment:** `README.md`, `DEPLOYMENT.md`, `package.json` (Bun workspaces `app`, `server`), `tsconfig.json`, `.env.example`, `.gitignore`, `.dockerignore`, `compose.yaml`, `Caddyfile`, git history (17 commits).
- **Docs and scripts:** `docs/README.md`, `docs/ideas/README.md`, `scripts/anchor.ts`, `scripts/sync-idl.ts`.
- **Frontend (`app/`):** `package.json`, `README.md`, `.cta.json`, `.oxlintrc.json`, `Dockerfile`, `serve.ts`, `vite.config.ts`, all tsconfigs, `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/lib/{chain,config,polyfill,program,solana}.ts`, `src/idl/*`, `src/index.css`, `src/App.css`.
- **Server (`server/`):** `package.json`, `README.md`, `Dockerfile`, `tsconfig.json`, `src/index.ts`.
- **Program (`program/`):** `README.md`, `Anchor.toml`, `Cargo.toml`, `rust-toolchain.toml`, `programs/course_program/{Cargo.toml, src/*.rs, src/instructions/*.rs, tests/test_initialize.rs}`.
- **Git history:** commit `ce00d05` deliberately removed `@solana/wallet-adapter-*`, `Providers.tsx` and `SmokeTest.tsx` so the template stayed idea-neutral.

**Prototype `curtain-sol` (all source read):**

- **Docs and agent config:** `AGENTS.md`, `PRODUCT.md`, `README.md`, `docs/{product-brief,build-plan,data-sources}.md`, `programs/relay-plan/README.md` (a spec only; there is no Rust).
- **Domain and server:** `db/migrations/001_initial.sql`, `src/domain/*`, `src/server/*`.
- **App and tests:** `app/api/**`, `app/components/**` (theatre UI), `app/lib/*`, `tests/*` (about 50 Vitest cases), `scripts/*.mjs`, `.mcp.json`, `.codex/config.toml`.

**External documentation (checked 2026-10-09).** **[V]** means verified on the official page; **[U]** means uncertain or my own inference.

- **Jupiter:**
  - [V] Swap API v2 has `GET /swap/v2/order`, `GET /swap/v2/build` and `POST /swap/v2/execute` on `api.jup.ag`, with `x-api-key` (https://developers.jup.ag/docs/swap).
  - [V] `/build` instruction order, rate limits and Price API v3 (https://developers.jup.ag/docs/swap/build, …/portal/rate-limits, …/price).
  - [V] The v1 `/swap-instructions` endpoint is "no longer actively maintained".
  - [U] Whether keyless access still works. Plan for an API key.
- **Anchor:**
  - [V] Latest is 1.2.1. In 1.x, `anchor test` uses Surfpool by default, LiteSVM is the default test framework, and the TS package is `@anchor-lang/core`.
  - [V] `emit!` events can be truncated in logs; `emit_cpi!` cannot (https://www.anchor-lang.com/docs/features/events).
- **Solana:**
  - [V] Transaction limits: 1232 bytes for v0, 4096 for v1; 64 account locks.
  - [V] Instruction introspection (instructions sysvar) sees only top-level instructions.
  - [V] `getSignaturesForAddress` supports only `confirmed` and `finalized`, with a 1000-per-page cursor.
  - [V] The Memo program only checks UTF-8 and the signers.
  - [V] `@solana/web3.js` v1 is maintenance-only. `@solana/kit` is at v8.
  - [V] Wallet Standard `solana:signIn` exists for Sign-In With Solana (SIWS).
- **Hono:**
  - [V] 4.13.x. `app.request()` and `testClient` support testing.
  - [V] `hono/csrf` **does not check JSON requests**.
  - [V] There is no built-in rate limiter.
- **TanStack Start:**
  - [V] `@tanstack/react-start` 1.168.x. The docs still say "Release Candidate".

**Skills and tools:** the installed skills were listed from `~/.agents/skills` (about 110). The candidates' SKILL.md files were read (section C). MCP status:

- The prototype configures `https://mcp.solana.com/mcp` (`.mcp.json`). This is **configured there, not here, and not verified working** in this session.
- `aws-mcp` failed to connect. It is irrelevant to Relay.
- Figma and Sanity are connected but not used, because there are no design files and no CMS.

---

## B. Repository audit

### Structure and stack (actual)

```
.
├── app/      TanStack Start 1.168 (React 19.2, Vite 8, TS 6), SSR, file routes, plain CSS, Bun
│             deps: @solana/web3.js ^1.99, @anchor-lang/core ^1.2.0, buffer polyfill
├── server/   Hono ^4.13 on Bun. One route: GET /health. CORS for localhost:5173
├── program/  Anchor workspace (NOT a Bun workspace). anchor-lang 1.1.2, Rust 1.89, LiteSVM 0.10 tests
│             crate course_program: Counter PDA ["counter"], initialize/increment
├── scripts/  anchor.ts (runs anchor through WSL on Windows), sync-idl.ts (target → app/src/idl)
├── docs/     README + ideas/README (an empty idea table)
├── compose.yaml + Caddyfile   Caddy: /api/* → server:3001 (prefix stripped), /* → app:3000
└── package.json  Bun workspaces [app, server]; TypeScript ~6.0
```

### What works today

- **Reading the cluster:** `app/src/lib/chain.ts`'s `getChainStatus` is a `createServerFn` that the `/` loader calls. It reads the slot and whether the program is deployed, during SSR.
- **Typed Anchor client:** `app/src/lib/program.ts` builds a read-only `Program<CourseProgram>` from the synced IDL.
- **Anchor tests:** a LiteSVM test (`tests/test_initialize.rs`) loads `target/deploy/course_program.so`.
- **Deployment:** the Docker images, Compose file and Caddy config. `DEPLOYMENT.md` says no image has been built yet on a machine with Docker.

### Placeholder, missing or stale

- **Placeholders:** the Counter program and the home page are both placeholders.
- **Missing:**
  - wallet integration (deliberately removed);
  - database;
  - authentication;
  - any TypeScript tests and any test runner for `app/` and `server/`;
  - React Query or another server-state library;
  - a design system: `index.css` is the Vite template with a purple `#aa3bff` accent.
- **Stale docs:**
  - `docs/ideas/README.md` mentions `SmokeTest.tsx`, which was removed.
  - `README.md`, `server/README.md` and `app/src/lib/config.ts` say "the server is optional / never required". That conflicts with Relay's needs; the owner approved changing it.

### Technical constraints

1. **The Solana toolchain runs only in WSL.** `program:*` scripts wrap WSL. `bun install` must run on Windows only, as the README warns.
2. **`VITE_*` values are compiled in at build time and are public.** The Jupiter API key and the RPC key must stay on the server.
3. **Development is cross-origin today:** `app` runs on :5173 and `server` on :3001. Production is same-origin through Caddy. → The plan adds a Vite dev proxy for `/api` so cookies and the CSRF model behave the same in both.
4. **`@anchor-lang/core` depends on `@solana/web3.js` v1**, which is maintenance-only. It can sign v0 transactions with lookup tables, which `/build` returns when you request `transactionVersion=0`. It cannot sign the new v1 transaction format, which needs Kit v8. → Keep web3.js v1 for the demo and request v0 transactions. Migrating to Kit + Codama is a post-demo decision record (ADR, see Z).
5. **Anchor 1.x already defaults to Surfpool** for `anchor test`/localnet, and `.gitignore` already ignores `.surfpool/`. The template expected this.

### Contradictions between documents and repo (flagged, not silently resolved)

| Source says                                                                                                       | Repo / this plan does                                                             | Resolution                                                                             |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Prototype `AGENTS.md`: "Next.js App Router, Solana Kit, Wallet Standard"; Tailwind; npm/Node                      | TanStack Start, web3.js v1 + `@anchor-lang/core`, Bun, plain CSS                  | The repo wins. Port the pure-TS domain logic only. Rewrite AGENTS rules for this repo. |
| Prototype `PRODUCT.md`: theatre "show" home with Stories-style horizontal navigation, lobby and 12 s auto-advance | Owner requires a vertical full-screen feed                                        | Replace the interaction model and keep some visual assets (section E).                 |
| Prototype: "Relay does not trade"                                                                                 | New scope: individually authorized Jupiter swaps with receipts                    | Superseded. Keep the read-only-by-default spirit: no automation, no custody.           |
| Prototype hashes JSON (`JSON.stringify([tag, fields])`)                                                           | The program must recompute or verify the commitment                               | Replace it with fixed-width binary encoding (section O).                               |
| Prototype `build-plan.md`: "Jupiter CPI from program"                                                             | Jupiter docs: CPI cannot use lookup tables and adds compute                       | Use top-level instruction composition through `/build` instead (Q).                    |
| Repo README: "program is the authority over rules and **asset movement**"                                         | Relay's program never moves assets. Jupiter does. The program _verifies_ outcomes | Update the README wording.                                                             |
| Repo README / server docs: "server optional"                                                                      | Server is required                                                                | Approved. Update the docs in Phase 4 (server) and Phase 9 (docs).                      |

---

## C. Skills audit

All candidates were read from `~/.agents/skills/*/SKILL.md`. No Solana-specific skill is installed. Solana correctness therefore comes from official docs (`source-driven-development`) and from adversarial tests.

| Skill                         | Specialization                                                                                                                                                                | Why Relay benefits                                                                                                                                                                                           | Alternatives considered                                                                                       | Why chosen                                                                                                              | Influences                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **impeccable** (v4.1.1)       | Design direction, `shape` / `critique` / `audit` / `harden` / `clarify` / `animate` / `adapt` commands. Reads `PRODUCT.md` and `DESIGN.md`. Has an "Operate" mode for app UI. | The feed card, the status language and calm finance motion are the product. Impeccable has explicit anti-slop and anti-pattern bans and a critique loop. The prototype already used its `PRODUCT.md` format. | `frontend-ui-engineering` (component craft, less direction), `web-design-guidelines` (compliance review only) | Strongest at direction plus critique. `clarify` fits the status-terminology problem exactly.                            | Sections G, E, F; `PRODUCT.md`/`DESIGN.md` at the repo root; polish pass in Phase 9 |
| **frontend-ui-engineering**   | Accessible, production React components and state                                                                                                                             | Turns the direction into maintainable components                                                                                                                                                             | impeccable alone                                                                                              | Complements impeccable's direction with implementation discipline                                                       | Section M, component structure                                                      |
| **web-design-guidelines**     | Reviews against the Web Interface Guidelines                                                                                                                                  | A cheap final accessibility and UX lint before the demo                                                                                                                                                      | impeccable `audit`                                                                                            | Gives a second, independent rule set                                                                                    | Phase 9 checklist                                                                   |
| **source-driven-development** | Grounds code in official docs with citations                                                                                                                                  | Jupiter, Anchor and Surfpool APIs changed during 2026                                                                                                                                                        | Memory                                                                                                        | Mandatory given the API churn                                                                                           | Sections Q, K, N; every integration task                                            |
| **security-and-hardening**    | Auth, sessions, input handling, external integrations                                                                                                                         | Nonces, sessions, CSRF, rate limits, untrusted transaction data                                                                                                                                              | `penetration-testing-with-strix` (needs a deployed target; later)                                             | Fits the design-time hardening of section T                                                                             | Sections N, T, L                                                                    |
| **test-driven-development**   | Tests first for logic                                                                                                                                                         | Integer math, entry status, the hash and program guards must be correct before they are used anywhere                                                                                                        | `tdd` (a similar Matt Pocock variant)                                                                         | One TDD skill is enough                                                                                                 | Section U; Phases 1–3                                                               |
| **playwright-cli**            | Browser automation and E2E                                                                                                                                                    | Mobile-viewport feed and the follow flow with burner wallets                                                                                                                                                 | `browser-testing-with-devtools`                                                                               | Produces repeatable E2E scripts                                                                                         | U (E2E), Phases 9 and 12                                                            |
| **dataviz**                   | Chart method, palette validator                                                                                                                                               | Entry-distribution strip and range bar must work in light, dark and color-blind modes                                                                                                                        | Ad hoc SVG                                                                                                    | Prevents misleading charts                                                                                              | G (charts), Phase 8                                                                 |
| **colosseum-copilot**         | Solana hackathon precedent research (Trenches.top, DeStreet, CredCall)                                                                                                        | Positions the competitive claims honestly                                                                                                                                                                    | Web search only                                                                                               | **Optional.** It needs an authenticated API and is **not verified working**. Use it only if the demo goes to Colosseum. | Section Y/competition                                                               |
| **domain-modeling**           | `CONTEXT.md` glossary and ADRs                                                                                                                                                | Terms like "In plan range", "receipt" and "wallet ≠ person" must not drift                                                                                                                                   | none                                                                                                          | Cheap and stops copy drift between UI, API and docs                                                                     | Glossary, Z (ADRs)                                                                  |

**Rejected:**

- `theming` and `vercel-react-native-skills`: Expo / React Native only.
- `aws-*` skills: the deployment target is a VPS with Compose.
- `app-store-compliance`: only if a native app is built later.
- Sanity and Figma: no CMS and no design files.
- `no-ai-slop`: a prose editor; maybe for pitch text later.

---

## D. Product definition

> **Owner clarification (2026-10-10):** Relay connects people with Solana traders' public ideas and verifiable activity in one scrolling experience, starting with 10 selected traders (never described as the best, verified partners or trustworthy without evidence). Four kinds of content stay distinct: public idea or post (with original source and timestamp; not proof of a trade), verified on-chain activity (a wallet is tied to a person only when supported), plan published through Relay (the only kind that can be reviewed as a trade), and fictional demo. Missing data stays missing. Imported posts never become executable plans; there is no Binance or copy-trading promise. Relay-native plans keep "Follow the plan. See the proof." and everything below. The backend is preserved; trader sources, post ingestion and wallet-activity indexing are planned, not built (see the Phase 7 discovery result and `PRODUCT.md`).

- **Target user:** an adult Solana spot trader who already follows trade ideas on X or Telegram. Second user: a creator who wants a track record that can be checked.
- **Problem:** "Creator made +20%" says nothing about whether a follower could have entered at a similar price, before expiry, at their size, after fees. Screenshots hide timing, slippage, liquidity, and losing or edited calls.
- **Central insight:** the unit of truth is **the follower's own execution against a specific, immutable plan version**, not the creator's PnL.
- **Value proposition:**
  - _For followers:_ "See in a few seconds whether the original entry still applies, act on it yourself with one reviewed transaction, and see what really happened to people who followed."
  - _For creators:_ "A public, tamper-evident record of what you said and when, plus evidence of how your followers actually did."
- **Product loop:**
  1. Discover the plan.
  2. Understand it.
  3. Read its entry status.
  4. Look at the details.
  5. (Optionally) watch it.
  6. Review a concrete swap.
  7. Approve it in the wallet.
  8. Receive an onchain receipt.
  9. Follow the plan's updates.
  10. Inspect your outcome.
  11. Compare it with what the creator and the other followers got.
  12. Choose whom to follow next.
- **MVP (product):**
  - **Pairs:** buy-side spot plans on two pairs, wSOL/USDC and JUP/USDC.
  - **Plans:** append-only versions; expiry; a closing state.
  - **Feed:** a vertical feed with live, advisory entry status.
  - **Watching:** local to the browser.
  - **Accounts:** SIWS sign-in for creators.
  - **Following:** one follow swap per approval, through Jupiter, with a verified receipt.
  - **My Plans:** receipts and an estimated open result.
  - **Comparison:** a per-plan view of the plan reference, the creator's observed entry and the followers' actual entries.
- **Non-goals (MVP):**
  - leverage, perpetuals, sells or shorts as the plan direction;
  - automatic copy trading, automated exits, account-wide permissions;
  - custody or vaults, pooled funds;
  - broad or memecoin token coverage;
  - DMs or chat, creator subscriptions, wagering or prediction markets;
  - fiat onramp;
  - native apps;
  - ML ranking.

**Challenges to the brief (stated honestly):**

1. **"Entry range" on a buy plan.** The lower bound is not an _entry_ constraint in the usual sense: a cheaper fill is better for the buyer. I still keep `[low, high]`, because creators use the low end to mean "below this, my thesis is broken". The program then enforces _both_ bounds for a receipt to count as "followed the plan". The UI calls the below-range state **"Below plan range"**, never "eligible".
2. **Exits.** Exiting is where follower results really diverge. A receipt-only MVP can only show an _estimated open result_. Exit receipts ("close via Relay") are the first post-demo milestone. Until then, no "realized" numbers are shown for live data.
3. **"Creator performance".** A creator can be measured fairly only if the creator _also_ enters through Relay. The same receipt mechanism then gives an apples-to-apples "creator observed entry". Without that, show "Creator entry not observed" and never infer one from wallet scraping.
4. **The TikTok feed may reward speed over understanding.** Countermeasures:
   - no one-tap trading;
   - the review sheet always sits between the card and the wallet;
   - no auto-advance;
   - no "hot" sorting by return.
5. **Three days is not enough for everything in this prompt.** Section W separates the 72-hour cut from the MVP. Analytics beyond the comparison panel, search, wallet linking, indexer backfill and exits are deferred.

---

## E. UX architecture

### Navigation

> **Owner decision (2026-10-10), supersedes the list below:** Discover `/`, Traders `/traders`, Watchlist `/watchlist`, Account `/account`. Phones: bottom tab bar inside the app only, never on the welcome. Desktop: the same destinations plus How it works in the header. `/me` and `/search` redirect.

Bottom tab bar, about 56 px, inside the safe area:

- **Feed** `/`
- **Search** `/search`
- **My Plans** `/me`
- **Profile/Wallet** `/account`

Creators get a "Publish" action on their profile and in the empty states. It is not a fifth tab.

### Onboarding

> **Owner decision (2026-10-10), supersedes the paragraph below:** first-time visitors to the feed land on a closed-curtain welcome with Cue, Relay's usher mascot. It shows RELAY, "Follow the plan. See the proof.", one paragraph, "Explore the plans" and a separate "Try a demo". The curtains open only on that click. _Copy revised the same day: "Meet the traders. Follow the evidence.", "Explore traders", "Try the demo"; no tab bar on the welcome (see the Phase 7 discovery result)._ Deep links (`?plan=`), the fictional preview and returning visitors skip it; `?welcome` (Account → "Meet Cue again") replays it. See the Phase 7 mascot result.

There is none before the first card. The first card is a one-time, dismissible "How Relay works" card with three lines:

- what "In plan range" means;
- that it is not advice;
- that every trade is your own approval.

A wallet is requested only when the user:

- presses **Review trade** or **Publish**, which need a connection (the publish transaction itself proves authorship); or
- edits a creator profile (handle, name, bio), which needs SIWS sign-in.

Watching never asks for a wallet.

### Prototype UX: keep / refine / remove / replace

| Prototype element                                                                            | Decision                                            | Why                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Curtain                                                                                      | **REFINE** (owner decision: theatre identity stays) | It becomes a one-time, skippable session intro (≤ 1.2 s) recolored in the Solana gradient. It no longer gates the feed. _Superseded 2026-10-10 by owner decision: first visits open on a closed-curtain welcome with Cue that waits for "Explore the plans" (see Onboarding)._ |
| Marquee with chasing bulbs                                                                   | **REFINE**                                          | It becomes the RELAY header logo, with bulbs in Solana purple and green. It moves slowly and stops under reduced motion.                                                                                                                                                       |
| Spotlight and stage floor                                                                    | **KEEP → card backdrop**                            | A low-opacity purple→green cone behind the active card. It sits behind the data, never on it.                                                                                                                                                                                  |
| Lobby gate                                                                                   | **REPLACE**                                         | Its seat-picker filters (assets, open-only) move to a filter sheet. The feed opens straight onto card 1.                                                                                                                                                                       |
| Fin screen                                                                                   | **REFINE**                                          | "Fin." becomes the end-of-feed card: "That's tonight's lineup — you're caught up". Encore is replaced by refresh, and "Take the stage" links to publish.                                                                                                                       |
| Stories horizontal swipe, 30% tap zones, 12 s auto-advance                                   | **REPLACE** with vertical scroll-snap               | Required by the brief. Auto-advancing financial content adds pressure.                                                                                                                                                                                                         |
| Status mechanics (`cueOf`: a status plus an always-visible hint)                             | **KEEP** mechanics, **REPLACE** words               | "On cue / Off cue / Curtain down" is charming but has to be translated. Plain status names follow below.                                                                                                                                                                       |
| CueMeter (a semicircle gauge relative to the ceiling)                                        | **REFINE → linear range bar**                       | Must show both bounds, read at small sizes, and fix the prototype bug where needle and status disagreed (the needle used `outAmount`, the status used `otherAmountThreshold`).                                                                                                 |
| Countdown (1 s tick, UTC title, "closed")                                                    | **KEEP**                                            | It is information, not pressure. Neutral styling, no red pulsing.                                                                                                                                                                                                              |
| Sigil (deterministic identicon)                                                              | **KEEP** as avatar fallback                         | It gives each creator a recognizable identity without uploads.                                                                                                                                                                                                                 |
| ScriptSheet (bottom-sheet details, version chips, methodology)                               | **KEEP → Layer 2 sheet**                            | Add drag-to-dismiss and a native `<dialog>` focus trap.                                                                                                                                                                                                                        |
| Watch star                                                                                   | **KEEP**; **REMOVE** the particle "Burst"           | The burst breaks the no-confetti rule.                                                                                                                                                                                                                                         |
| "Fictional" badge and lobby disclaimer copy                                                  | **KEEP**                                            | It is required for demo data.                                                                                                                                                                                                                                                  |
| WalletMatch ("You hold SOL") personalisation                                                 | **REFINE (later)**                                  | Opt-in, read-only. Move it to Account.                                                                                                                                                                                                                                         |
| Ticker strip                                                                                 | **REMOVE** for MVP                                  | Moving numbers that are not about the card's subject.                                                                                                                                                                                                                          |
| PlanTermsForm (presets, integer helper copy, "not a stop-loss" helper)                       | **KEEP copy, REFINE** into a mobile composer        | Its validation messages are good.                                                                                                                                                                                                                                              |
| Plan page with version history and hashes                                                    | **KEEP → Layer 3** route `/p/$planPda`              | Deep links and share targets.                                                                                                                                                                                                                                                  |
| `casting.ts` ranking (status rank, then held/watched, then recency; closed never above open) | **KEEP the idea → server ranking** (section F)      | It is already deterministic and tested.                                                                                                                                                                                                                                        |
| Theatre palette (velvet, brass, curtain red)                                                 | **RECOLOR** to the Solana palette (section G)       | Owner decision: keep the theatre, but in Solana purple and green on a dark velvet base.                                                                                                                                                                                        |
| Big Shoulders display type                                                                   | **KEEP**                                            | It is part of the theatre identity. Data stays in a tabular grotesk.                                                                                                                                                                                                           |
| Template `index.css` purple accent                                                           | **REPLACE**                                         | Template leftover.                                                                                                                                                                                                                                                             |

### Entry-status vocabulary

These names must be used identically in the UI, the API enum, the docs and the tests.

| API enum                               | Headline (Layer 1)                  | Always-visible hint                                                         | Icon / shape                                  |
| -------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------- |
| `in_range`                             | **In plan range**                   | "Price is inside the creator's original entry. Not a recommendation."       | filled circle-check                           |
| `in_range` + `closing_soon` (≤ 10 min) | **In plan range · closes in 7 min** | same hint                                                                   | circle-check plus a clock glyph; no animation |
| `above_range`                          | **Original entry passed**           | "Price is above the plan's entry. Following now would not match the plan."  | arrow-up-right in an outlined circle          |
| `below_range`                          | **Below plan range**                | "Price is under the plan's entry. The creator's thesis may no longer hold." | arrow-down-right in an outlined circle        |
| `expired`                              | **Plan expired**                    | "The entry window closed at 15:00."                                         | clock with slash                              |
| `closed`                               | **Closed by creator**               | "The creator stopped new entries. History stays visible."                   | lock                                          |
| `price_stale`                          | **Price may be outdated**           | "Last price 2 min ago. Status will update when data returns."               | dashed outline                                |
| `price_unavailable`                    | **Price unavailable**               | "We can't check the entry right now."                                       | dashed outline                                |

"Eligible" and "Ineligible" are not used: they sound like permission or a recommendation. **"Original entry passed"** says what happened without judging it. **Terminology test** (pilot, section Y): a 5-second exposure, then two questions: "Could you still enter on the creator's original terms?" (target ≥ 80% correct) and "Does this mean it's a good trade?" (target ≥ 80% answer "no" or "not necessarily").

### The trade card: progressive disclosure

**Layer 1, readable in 2–5 seconds (wireframe at 390×844, dark):**

```
┌─────────────────────────────────────┐
│ (◆) Mika Tan  @mika · 12m · v2 ↻    │  creator · age · version; "↻ updated 4m ago" chip if v>1
│  [FICTIONAL]                        │  only for demo data
│                                     │
│  SOL / USDC            Buy plan     │  pair is the largest text on the card
│  Entry  $180.00 – $185.00           │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ✓ In plan range                 │ │  ENTRY STATUS: icon + words + shape
│ │ ├──────[████████●███]──────────┤│ │  range bar; ● = current reference price
│ │ Now $183.20 · updated 4s ago    │ │
│ │ Price inside the original entry.│ │
│ │ Not a recommendation.           │ │
│ └─────────────────────────────────┘ │
│  Window closes 15:00 (in 20 min)    │
│                                     │
│  "Retest of 180 support after the   │  rationale, 2-line clamp
│   breakout; invalid under 178."     │
│                                     │
│  14 wallets followed · median entry │  evidence line, or "No followers yet"
│  $182.10 · creator entry observed   │
│                                     │
│ [☆ Watch]  [Details ⌃]  [Review trade]│ thumb zone; 48px targets; Review is a filled button
└─────────────────────────────────────┘
│ Feed   Search   My Plans   Account  │
```

**Review trade** is shown only for `in_range`. In every other state its slot shows a disabled explanation instead ("Original entry passed — no Relay entry available"). There is no hidden button, so the reason is always visible.

**Layer 2, the details sheet (without leaving the feed):**

- full rationale and exit thesis, with a "not a stop-loss order" note;
- exit target and invalidation level, if given;
- version timeline: "v1 12:00 entry 180–185, exit 200 → v2 12:20 exit 194", with **what changed** highlighted;
- follower evidence: an entry strip plot against the range, n wallets, blocked attempts;
- creator coverage: linked wallet(s), "observed through Relay receipts only";
- "What does In plan range mean?" (an expandable explainer);
- links to the full plan page and the creator profile.

**Layer 3, the plan page `/p/$planPda`:**

- everything above, plus every version in full with `terms_hash`, version account and transaction links;
- methodology and how results are calculated;
- the comparison panel: plan reference vs creator observed vs followers actual;
- the list of receipts (wallets shortened) and failed attempts with their reasons;
- the onchain verification block, i.e. "Verify yourself": program ID, accounts, and the hash recomputed client-side.

### Other screens (wireframes, abbreviated)

```
TRANSACTION REVIEW (sheet, full height)
  Review trade                                   ✕
  You pay          100.00 USDC          [edit amount]
  You receive      ≈ 0.5456 SOL
  Minimum          0.5429 SOL  (if price moves, the swap fails instead)
  Your price       $183.28 per SOL  ✓ inside plan entry $180–185
  Plan             Mika Tan · SOL/USDC · version 2
  Window closes    15:00 (in 19 min)
  Network fee      ~0.00008 SOL · Relay record deposit 0.0023 SOL
  Route            Jupiter (Metis) · 2 hops
  Quote refreshes in 22s                         [Refresh]
  ⓘ Relay records this swap against version 2. Entry inside the plan is not
    a prediction of profit. Your wallet will ask you to approve.
  [ Approve in wallet ]
States: Fetching quote → Ready → Quote expired → Awaiting wallet → Rejected / Submitted →
        Confirming → Recorded ✓ / Failed (reason in words, tx link)

MY PLANS (/me)        Watching (local) | Followed (receipts)
  SOL/USDC · Mika · v2   Entered $183.28 · 100 USDC → 0.5456 SOL
  Estimated now +1.2% (open position, estimate)  · creator updated plan after your entry (v3)
  [View receipt] [Plan]

CREATOR PROFILE (/c/$address)
  (◆) Mika Tan @mika  · Linked wallet 7xKX…9fQ (verified by signature, 1 wallet)
  Coverage: Relay receipts only. Other wallets this person may use are not visible.
  Open plans (2) · Past plans (11, incl. 4 closed early, 3 expired unfilled)
  Followers' actual results: median −0.8% across 37 wallets / 9 plans (estimates for open)
  Creator observed entries: 6 of 11 plans
```

### Empty and error states

| State                                  | Copy and behavior                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| No plans                               | "No open plans right now." Show recently expired plans with their outcomes.                                                            |
| No followers yet                       | "No wallets have followed this version yet." Never show 0% or N/A as a number.                                                         |
| Insufficient data (n < 3)              | List the individual entries instead of a median.                                                                                       |
| Wallet disconnected                    | "Connect a wallet to review a trade. Browsing and watching don't need one."                                                            |
| Wallet verification required (publish) | "Sign a message to prove you control this wallet. This is not a transaction and costs nothing."                                        |
| RPC unavailable                        | Banner: "Can't reach Solana right now. Statuses may be out of date." Disable Review.                                                   |
| Indexer delayed                        | On results: "Results last updated 3 min ago; recent trades may be missing."                                                            |
| Market data stale                      | Status → `price_stale`. Never keep showing an old "In plan range".                                                                     |
| API down                               | Full-screen "Relay's service is unavailable" with retry. Cached cards are greyed and marked offline.                                   |
| Transaction failed                     | Show the plain reason, the transaction link, and "No receipt was created. Your funds stayed in your wallet" when the program reverted. |

---

## F. Vertical feed design

- **Scroll mechanics:**
  - Native scrolling with CSS scroll-snap: the container is `height: 100dvh; overflow-y: auto; scroll-snap-type: y mandatory; overscroll-behavior-y: contain`.
  - Each card is `height: calc(100dvh - var(--tabbar) - env(safe-area-inset-bottom)); scroll-snap-align: start; scroll-snap-stop: always`.
  - Native scrolling gives momentum, accessibility, keyboard and screen-reader support for free. No gesture library.
  - `scroll-snap-stop: always` prevents skipping cards with a fling.
- **Height and safe areas:**
  - Use `100dvh`, not `100vh`, so the mobile browser chrome doesn't clip content.
  - Pad with `env(safe-area-inset-*)`, set `viewport-fit=cover` in `__root.tsx`, and keep the tab bar fixed.
  - Card content uses a column with the action row pinned to the bottom (thumb zone).
- **Pull-to-refresh conflict:**
  - `overscroll-behavior-y: contain` stops the browser's pull-to-refresh and scroll chaining inside the feed.
  - Refresh is explicit: a "New plans (3)" pill appears at the top when the poll finds newer items.
  - New cards are never inserted above the current position.
- **Active card detection:**
  - An `IntersectionObserver` with threshold 0.6 sets `activeIndex`.
  - The active plan ID is written to the URL with `navigate({ search: { plan }, replace: true })`, throttled.
  - This gives deep links and lets the back button restore the position.
- **Virtualization:**
  - Only cards `activeIndex ± 2` are rendered in full. The others are fixed-height placeholders with the same snap alignment, so scroll height stays stable.
  - Live-price subscriptions apply only to the rendered window.
  - About 5 rendered cards is cheap; no virtualization library is needed.
- **Prefetching:**
  - The feed is paged at 10 cards.
  - When `activeIndex ≥ loaded − 3`, fetch the next page with `useInfiniteQuery`.
  - Creator avatars for the next two cards are preloaded.
  - The first page is SSR'd through a route loader, so the first paint has a real card. Live status hydrates afterwards.
- **Preserving scroll position:**
  - Opening Layer 3 is a route change.
  - On back, the router's `scrollRestoration` is unreliable for an inner scroll container, so the feed reads `?plan=` and calls `scrollIntoView({ block: 'start' })` on mount.
  - The query cache keeps the loaded pages.
- **Preventing accidental actions:**
  - No double-tap and no swipe gestures trigger actions.
  - Review opens a sheet; it never signs directly.
  - "Approve in wallet" is a second deliberate tap, and the wallet itself is a third confirmation.
  - Buttons sit at least 8 px apart and are at least 48 px tall.
  - While the details sheet is open, the feed is `inert`.
- **Opening details:** a tap on "Details", or on the rationale, opens a Layer 2 `<dialog>` sheet with drag-to-dismiss. The sheet's handle also works with keyboard (Esc).
- **Watch:**
  - An optimistic toggle stored in `localStorage` (`relay:watched`, wrapped in try/catch).
  - Confirmation is an `aria-live` announcement ("Watching Mika's SOL plan").
  - No server call in the MVP.
- **Review trade:** shown only in the `in_range` state. The CTA label never says "Buy now". It says "Review trade".
- **Desktop fallback (≥ 900 px):**
  - A centered 440 px card column with the Layer 2 details permanently open in a right-hand panel for the active card.
  - Keyboard: ↑/↓ or j/k move between cards, `w` watches, `d` opens details. Hints appear in the footer.
  - The mouse wheel still snaps.
- **Accessibility:**
  - The container follows the ARIA feed pattern: `role="feed"` and `aria-busy` while loading.
  - Each card is an `<article aria-posinset aria-setsize aria-labelledby>`.
  - Status changes on the _active_ card are announced politely ("Mika's SOL plan: original entry passed").
  - Countdown ticks are not announced.
  - `prefers-reduced-motion` makes `scroll-behavior` instant and turns off transitions.
  - Focus is visible: a 2 px outline offset, in both light and dark themes.
- **Ranking (deterministic, server-side, MVP).** Order is by bucket first, then recency within each bucket.
  1. Open and `in_range`.
  2. Open, `below_range` or `above_range`.
  3. Open with an unknown price.
  4. Expired or closed in the last 24 h, for honest outcome browsing.
  5. Older plans.

  Later boosts, kept small and documented:
  - followed creators;
  - watched pairs;
  - creators with observed entries (coverage).

  Never rank by claimed or simulated return. Sample size is shown, not used for ranking, to avoid rich-get-richer.

  Pagination uses an opaque cursor into a 30 s ranked snapshot cached in server memory. N is small in the MVP.

---

## G. Design direction

**Owner decision (2026-10-09): keep the prototype's theatre identity and recolor it in Solana colors.** It should look unmistakably crypto and Solana.

This overrides the original brief's "avoid purple gradients / Web3 look" for _branding_. The financial-safety guardrails still hold for _data_. Impeccable's own rule ("the brief wins; honor pinned aesthetics") means it must work within this direction, not argue it back to neutral.

Run **impeccable** `shape`, then new-work, before building the UI. Seed it with a rewritten `PRODUCT.md` at the repo root (the vertical-feed version of the prototype's, with the theatre and Solana identity pinned) plus the constraints below.

- **Philosophy:** "a theatre stage lit in Solana colors." The _frame_ is the curtain, the marquee, the spotlight and the stage, all expressive and on brand. The _information_ (status, prices, the review screen) stays calm, flat and legible. The spectacle lives around the data, never on it.
  - Mode: **Experience** for the brand frame (intro, marquee, backdrops), **Operate** for the card's data, the review screen and My Plans, and **Read** for the plan page.
- **Typography:**
  - Display: keep the prototype's **Big Shoulders Display** (the marquee, creator names, pair names).
  - UI and numbers: a confident grotesk, with `font-variant-numeric: tabular-nums` mandatory on prices.
  - Self-hosted with `@fontsource`; no runtime Google Fonts.
  - Type scale based on 16 px. The pair is about 32 px, the status headline about 20 px, the body 15–16 px.
- **Spacing and hierarchy:**
  - 4/8 px grid; the card has 20 px side gutters.
  - The visual weight is the status block, then the pair, then the creator, then the rationale.
  - Only one filled button per card.
- **Color: the Solana palette on a dark theatre.**
  - **Brand colors.** Solana purple `#9945FF` and Solana green `#14F195`, with the purple→green brand gradient. Verify the exact values against Solana's official brand kit before shipping, and don't use the Solana logo itself without checking its brand-usage terms.
  - **Base.** Deep "velvet" near-black with a purple tint, for example `#0B0716`, with raised surfaces one step lighter and a near-white "chalk" for text. Dark is the primary theme; a light theme is MVP-later.
  - **Where the gradient and glow are allowed (brand frame):**
    - the curtain;
    - the RELAY marquee sign and logo;
    - the spotlight backdrop behind each card;
    - the active tab indicator;
    - the primary "Review trade" button;
    - progress in the review stepper.
  - **Where they are banned (data):**
    - no gradients or glow behind prices, percentages or status text;
    - no flashing or pulsing numbers;
    - numbers sit on flat surfaces.
  - **Status colors.** Each one always comes with an icon, a shape and words:
    - in range: **Solana green** (on brand, and naturally reads as "go");
    - original entry passed / above range: amber, _not red_, since it is not an error or a loss;
    - below range: cyan-blue;
    - expired / closed: muted lavender-gray.
  - **Red is reserved for failed transactions and errors.**
  - Gains and losses use ▲/▼ glyphs and signs; color is never the only signal.
  - **Contrast:** neon green and purple on near-black must still pass ≥ 4.5:1 for text. Purple `#9945FF` on dark is borderline for body text, so it is used for fills and accents, not small text. Validate with the dataviz palette validator, including a color-blind simulation.
- **Components:**
  - Cards are stage panels: a flat surface with a hairline border tinted by the brand gradient, and a soft spotlight cone behind the card in purple→green at low opacity.
  - Native `<dialog>` for sheets ("Script" sheet keeps its theatre name); pill tabs.
  - Glassmorphism only on the bottom tab bar, if anywhere.
- **Motion:** state only, 150–250 ms ease-out.
  - Snap uses native scrolling.
  - Sheets slide up.
  - A status transition crossfades the headline and slides the range-bar marker.
  - Review states use a progress stepper, not spinners.
  - "Recorded ✓" settles with a 200 ms scale from 0.96 to 1. **No confetti and no sounds.**
  - Brand motion (theatre):
    - The curtain opens once per session as a skippable intro of ≤ 1.2 s; it never gates the feed on later visits.
    - The marquee bulbs chase slowly in the header logo only.
    - The spotlight cone eases in when a card becomes active.
    - None of these animate financial data.
  - Everything is disabled under reduced motion.
- **Charts (MVP):**
  1. Range bar: the plan band, a current-price marker, and arrow clamps when out of range.
  2. Entry strip plot: one dot per follower entry against the band, with the creator's observed entry as a distinct shape.
  3. Comparison panel: three labelled numbers with methodology tooltips.

  Line charts of price history come later.

- **Light/dark:** CSS custom properties on `:root` with `prefers-color-scheme`, plus a manual override stored in `localStorage`. The existing `index.css` token approach is replaced, not extended.

---

## H. System architecture

```
 Browser (mobile web)
  TanStack Start app (SSR on Bun :3000)          Wallet (Wallet Standard via wallet-adapter;
   ├─ routes / loaders (SSR first page) ─┐        burner wallet on localnet demo only)
   ├─ React Query (feed, prices, quotes) │              ▲ signMessage / signIn / signTransaction
   └─ tx review state machine ───────────┼──────────────┘
          │ same-origin /api/*           │ sendRawTransaction / confirm
          ▼                              ▼
 Caddy (prod)  /api/* → strip → Hono     Solana RPC (Surfpool fork on :8899 for demo;
 Vite proxy (dev) /api → :3001             devnet/mainnet RPC later)
          ▼                                      │
 Hono on Bun :3001 (single process)              │  Relay Anchor program
   ├─ auth (SIWS, sessions)                      │   Plan / PlanVersion / FollowReceipt PDAs
   ├─ plans, creators, feed, search              │
   ├─ prices (Jupiter Price v3, cached)  ──► api.jup.ag (server-side key)
   ├─ follow: /build → compose → simulate ──► api.jup.ag/swap/v2/build
   ├─ verify receipts / confirm commitments ◄──── reads accounts + txs
   ├─ indexer loop (poll accounts + signatures, checkpoints)
   └─ Postgres (Compose service)
 @relay/domain (new workspace): canonical hashing, integer price math, entry status — used by app AND server
```

### Structural changes and why each is needed

1. **New Bun workspace `domain/` (`@relay/domain`).**
   - _Limitation:_ the creator's browser must compute the plan commitment it is about to sign, and the server must compute the same bytes to verify it.
     - Entry-status logic must be identical on the card (app) and in ranking (server).
     - The follow transaction must be composed identically by the server (to simulate it) and by the client (so it signs what it built).
     - Two copies of any of these would be a correctness and security hazard.
   - _Smallest fix:_ one TS folder added to the root `workspaces`.
     - Its core is dependency-free.
     - Only the `@relay/domain/tx` subpath imports `@solana/web3.js`, which the app already uses.
   - _Alternatives:_ `app` importing from `server` couples the UI image to server dependencies; a `packages/` tree is a restructure.
   - _Cost:_ the root `package.json` gets a third workspace entry, and both Dockerfiles gain `COPY domain …`. Low risk.
2. **Postgres in `compose.yaml`.** An internal network with no published ports in prod; a loopback port in dev.
3. **Vite dev proxy `/api → 127.0.0.1:3001`** (with prefix rewrite) in `app/vite.config.ts`. This makes dev same-origin like prod, so `config.ts` can default `API_URL` to `/api`.
4. **Program rename `course_program → relay`.** The repo's own docs require this once an idea is chosen.

No other restructuring.

---

## I. Onchain / offchain matrix

| Concern                              | Client                                    | Hono                                      | Database                 | Solana                                                                        | Reason                                                        |
| ------------------------------------ | ----------------------------------------- | ----------------------------------------- | ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Plan entry bounds, expiry, mints     | display; computes the hash before signing | verifies commits (`/confirm`, indexer)    | copy (indexed)           | **authority** (PlanVersion)                                                   | They must be enforced at follow time and must not be editable |
| Publication time                     | display                                   | —                                         | copy                     | **authority** (Clock at commit)                                               | The creator can't backdate it                                 |
| Rationale, exit thesis text          | display; hashes it                        | stores and validates                      | **authority for text**   | `content_hash` only                                                           | Text is big. The hash makes edits detectable.                 |
| Version history                      | display                                   | append-only API                           | append-only plus trigger | **authority** (one PDA per version, hash chain)                               | Silent rewrites are impossible onchain                        |
| Creator profile (name, avatar, bio)  | display                                   | auth-gated edits                          | **authority**            | —                                                                             | Normal software                                               |
| Wallet control proof                 | signs a message                           | verifies, issues a session                | nonces, sessions         | — (no transaction)                                                            | Authentication is not authorization                           |
| Current price for feed status        | display, age                              | **fetches and caches** (Jupiter Price v3) | observations (light)     | —                                                                             | Advisory only. Labelled as such.                              |
| Quote for your size                  | display                                   | **fetches `/build`**, simulates           | —                        | —                                                                             | Needs the API key, so it stays server-side                    |
| Follow eligibility at execution      | pre-checks                                | pre-checks                                | —                        | **authority** (`finish_follow` checks actual token deltas against the bounds) | The only check that can't be bypassed                         |
| Receipt (amounts, follower, version) | display                                   | verifies, indexes                         | copy                     | **authority** (FollowReceipt PDA)                                             | Client numbers are never trusted                              |
| Failed attempts                      | shows its own failure                     | indexes failed program transactions       | **record**               | transaction exists with an error                                              | "Failed stays failed"                                         |
| Watch list                           | **authority (MVP, localStorage)**         | later: sync                               | later                    | —                                                                             | Needs no wallet                                               |
| Follower / creator analytics         | display                                   | **derives**                               | derived tables / views   | inputs only                                                                   | Recomputable from chain plus prices                           |
| Session                              | cookie (HttpOnly)                         | **authority**                             | hashed token             | —                                                                             | Normal software                                               |

---

## J. Data model (Postgres; SQL migrations in `server/migrations/NNN_*.sql`)

Amounts are `numeric(20,0)` (u64). Mints and addresses are base58 `text`. Hashes are `bytea` (32 bytes). Times are `timestamptz`.

| Entity                                 | Status                                     | Purpose and key fields                                                                                                                                                                                                                                                                                                                                    | Source of truth                                                 | Mutability / auth                                                                                                              |
| -------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `schema_migrations`                    | MVP                                        | applied migration names                                                                                                                                                                                                                                                                                                                                   | DB                                                              | runner only                                                                                                                    |
| `auth_nonces`                          | MVP                                        | `nonce` PK, `address`, `siws_input jsonb`, `expires_at`, `used_at`                                                                                                                                                                                                                                                                                        | Hono                                                            | single-use: `UPDATE … SET used_at=now() WHERE nonce=$1 AND used_at IS NULL AND expires_at>now() RETURNING *`                   |
| `sessions`                             | MVP                                        | `token_hash bytea` PK (SHA-256 of a 32-byte random token), `address`, `created_at`, `expires_at`, `revoked_at`                                                                                                                                                                                                                                            | Hono                                                            | revoke on logout; 7-day TTL                                                                                                    |
| `creators`                             | MVP                                        | `address` PK (the SIWS wallet), `handle` unique (case-insensitive), `display_name`, `bio`, `avatar_url`, `is_demo`                                                                                                                                                                                                                                        | DB                                                              | the owner session only                                                                                                         |
| `plans`                                | MVP                                        | `plan_pda` PK, `cluster`, `creator_address` FK, `onchain_plan_id numeric(20,0)`, `base_mint`, `quote_mint`, `base_decimals`, `quote_decimals`, `status` (open/closed), `created_slot`, `closed_at`, `is_demo`                                                                                                                                             | **Solana** (copied after verification)                          | written only by confirm or indexer                                                                                             |
| `plan_drafts`                          | **Not needed**                             | —                                                                                                                                                                                                                                                                                                                                                         | —                                                               | The client hashes the plan text itself. `/confirm` accepts the text only if it matches the onchain `content_hash` (section O). |
| `plan_versions`                        | MVP                                        | PK (`plan_pda`, `version`); `entry_low`, `entry_high`, `expires_at`, `published_at` (chain), `published_slot`, `rationale`, `exit_thesis`, `exit_target` (nullable), `invalidation_price` (nullable), `content_hash`, `terms_hash`, `prev_terms_hash`, `version_pda`, `tx_signature`, `ref_price_at_publish`, `ref_price_source`, `ref_price_observed_at` | Solana for terms; DB for text (verified against `content_hash`) | **insert-only**: a trigger raises on UPDATE/DELETE (ported from the prototype)                                                 |
| `executions`                           | MVP                                        | `id`, `cluster`, `tx_signature` UNIQUE, `follower`, `plan_pda`, `version`, `receipt_pda` UNIQUE NULL, `status` (recorded/failed), `error_code`, `error_name`, `quote_spent`, `base_received`, `effective_price`, `slot`, `block_time`, `fee_lamports`, `seen_by` (verify/indexer)                                                                         | Solana (derived)                                                | upsert by signature only; never downgrade recorded → failed                                                                    |
| `indexer_checkpoints`                  | MVP                                        | (`cluster`, `program_id`) PK, `last_signature`, `last_slot`, `updated_at`, `last_error`                                                                                                                                                                                                                                                                   | Hono                                                            | the indexer only                                                                                                               |
| `price_observations`                   | MVP-light                                  | `mint`, `price_quote_units numeric(20,0)`, `source`, `observed_at` (one row per mint per minute)                                                                                                                                                                                                                                                          | external (Jupiter)                                              | append; prune > 30 days                                                                                                        |
| `wallet_links`                         | Later                                      | `creator_address`, `wallet_address`, `proof_message`, `signature`, `verified_at`                                                                                                                                                                                                                                                                          | Hono                                                            | for multi-wallet coverage                                                                                                      |
| `watches`                              | Later                                      | `address`, `plan_pda`, `created_at`                                                                                                                                                                                                                                                                                                                       | DB                                                              | after login sync                                                                                                               |
| `exits` / `position_events`            | Later                                      | exit receipts linked to `receipt_pda`                                                                                                                                                                                                                                                                                                                     | Solana (derived)                                                | —                                                                                                                              |
| `creator_metrics`, `plan_metrics`      | Later                                      | materialized from executions plus prices                                                                                                                                                                                                                                                                                                                  | derived                                                         | recompute job                                                                                                                  |
| `users` (separate from wallet)         | Not needed until embedded wallets or Privy | —                                                                                                                                                                                                                                                                                                                                                         | —                                                               | —                                                                                                                              |
| `market_snapshots` (order books, OHLC) | Not needed                                 | —                                                                                                                                                                                                                                                                                                                                                         | —                                                               | —                                                                                                                              |

---

## K. Solana program design (`program/programs/relay`)

### PDAs explained twice

- **Technical:** a Program Derived Address is a 32-byte address computed by `find_program_address(seeds, program_id)`. The address is deliberately _off_ the ed25519 curve, so no private key exists for it. Only the program that owns it can sign for it (through `invoke_signed`) and write to it. The `bump` is the byte that pushes the hash off the curve; it is stored so later lookups are cheap.
- **Plain developer language:** a PDA is like a database row whose primary key is a deterministic hash of some fields (for example `"plan" + creator + plan_id`). Anyone can compute where the row lives. Only our program can create or change it. Nobody holds a password for it.

### Accounts

| Account         | Seeds                                                | Fields (bytes)                                                                                                                                                                                                                                                                    | Size / rent*                                        | Mutability and lifecycle                                                                                                                                                              |
| --------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Plan`          | `["plan", creator, plan_id: u64 LE]`                 | creator 32, plan_id 8, base_mint 32, quote_mint 32, base_decimals 1, quote_decimals 1, latest_version 2, status 1 (Open/Closed), created_at 8, bump 1                                                                                                                             | 8+118 = 126 B, about 0.0018 SOL                     | `latest_version` and `status` change through revise/close. Never closed: it is history.                                                                                               |
| `PlanVersion`   | `["version", plan, version: u16 LE]`                 | plan 32, version 2, entry_low 8, entry_high 8, expires_at 8, published_at 8, published_slot 8, content_hash 32, prev_terms_hash 32, terms_hash 32, bump 1                                                                                                                         | 8+171 = 179 B, about 0.0021 SOL                     | **Immutable** after `init`. No instruction can write or close it.                                                                                                                     |
| `FollowReceipt` | `["receipt", plan_version, follower, nonce: u64 LE]` | plan 32, version 2, follower 32, pre_base 8, pre_quote 8, max_quote_in 8, quote_spent 8, base_received 8, status 1 (Pending/Recorded), recorded_at 8, slot 8, nonce 8, bump 1. Token accounts are not stored: they must be the follower's canonical ATAs, so they can be derived. | 8+139 = 147 B, about 0.0019 SOL (the follower pays) | Pending exists only _inside_ the transaction (see the introspection rule). It becomes Recorded in the same transaction. Never closed in the MVP (rent is shown on the review screen). |

\* Rent ≈ (128 + size) × 6960 lamports. **Verify on localnet.**

- **Owner:** the Relay program owns all three accounts.
- **Authority:**
  - `Plan` and `PlanVersion`: `plan.creator`.
  - `FollowReceipt`: written only by the program, during the follow pair.
- **Versioning and migration:**
  - Each struct starts with an Anchor discriminator. Adding fields later means new account types (`PlanV2`), not resizing.
  - The commitment domain tag (`relay:plan-version:v1`) is versioned.

**Why each onchain field exists:**

- **Mints, decimals, bounds and expiry:** `finish_follow` enforces them.
- **`published_at` and `published_slot`:** a timestamp the creator cannot fake.
- **`content_hash`:** binds the offchain text without storing it.
- **`prev_terms_hash`:** a hash chain, so a version can't be inserted or replaced.
- **`terms_hash`:** a single value that clients and indexers compare.
- **Receipt amounts:** they are the evidence.
- **Deliberately offchain:** rationale text, exit thesis and target, creator name, and any price observations.

### Instructions

| Instruction                                                             | Signer   | Accounts                                                                                                                                                                                                                                                         | Checks (Anchor-enforced)                                                                                                                                                                                                                                                 | Effect / event                                                                                                                                                                           |
| ----------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_plan(plan_id, entry_low, entry_high, expires_at, content_hash)` | creator  | creator (mut, signer), plan (init), version (init, v1), base_mint, quote_mint (`Account<Mint>`, SPL Token program only), system                                                                                                                                  | pair ∈ compile-time allowlist (base ∈ {wSOL, JUP}, quote = USDC; mainnet mints, which also exist on the Surfpool fork); `0 < entry_low ≤ entry_high`; `now + MIN_WINDOW(60 s) ≤ expires_at ≤ now + MAX_WINDOW(7 d)`; decimals read from the mint accounts, not from args | Inits both. `terms_hash` is **computed onchain** with `prev = [0;32]`. Emits `PlanCommitted{plan, creator, version:1, terms_hash, expires_at}`.                                          |
| `revise_plan(entry_low, entry_high, expires_at, content_hash)`          | creator  | creator, plan (mut, `has_one = creator`), prev_version (seeds with `plan.latest_version`), new_version (init with `latest+1`)                                                                                                                                    | `plan.status == Open`; `latest_version < MAX_VERSIONS(16)`; same bound and window rules. Mints are not args, so the pair can't change.                                                                                                                                   | `latest_version += 1`. The new `terms_hash` chains on `prev_version.terms_hash`. Emits `PlanRevised`. Revising after expiry is allowed and appears in the UI as "Window reopened in v3". |
| `close_plan()`                                                          | creator  | creator, plan (mut, `has_one`)                                                                                                                                                                                                                                   | status Open                                                                                                                                                                                                                                                              | status = Closed. Emits `PlanClosed`. Versions remain.                                                                                                                                    |
| `begin_follow(version: u16, nonce: u64, max_quote_in: u64)`             | follower | follower (mut, signer), plan, plan_version (seeds), receipt (init), follower_base (`TokenAccount`, **address = ATA(follower, plan.base_mint)**), follower_quote (**address = ATA(follower, USDC)**), token_program (SPL Token only), instructions sysvar, system | plan Open; `version == plan.latest_version` (stale reviews fail: "Plan updated — review again"); `published_at ≤ now < expires_at`; `max_quote_in > 0`; **top-level-only and layout rules**, see below                                                                   | Snapshots pre-balances into the receipt with status Pending                                                                                                                              |
| `finish_follow()`                                                       | follower | follower (signer), plan, plan_version, receipt (mut, `has_one = follower`), follower_base, follower_quote (same ATA address constraints). No sysvar and no System program, to save transaction bytes.                                                            | top-level only; receipt Pending; `base_received = post − pre > 0` (`checked_sub`); `quote_spent = pre − post > 0`; `quote_spent ≤ max_quote_in`; **price bounds in u128:** `quote_spent·10^base_dec ≤ entry_high·base_received` and `≥ entry_low·base_received`          | status = Recorded, with amounts, slot and time. Emits `FollowRecorded{receipt, plan, version, follower, quote_spent, base_received}`.                                                    |

**Anti-forgery rules (prevent fake receipts).** These were hardened after an adversarial review.

1. **Top-level only** (both instructions):
   - `get_stack_height() == TRANSACTION_LEVEL_STACK_HEIGHT`.
   - The instruction at `load_current_index_checked()` has `program_id == crate::ID`, the matching discriminator, and this receipt's key.
   - _What this rules out:_ without it, an attacker's own program could CPI into `begin_follow` (a program calling a program), move tokens itself, and pass introspection. Under CPI, introspection would only see the attacker's top-level instruction.
2. **Layout** (`begin_follow`, using the instructions sysvar with `load_instruction_at_checked`):
   - The transaction contains exactly one Relay `begin_follow` and exactly one Relay `finish_follow`.
   - `finish_follow` is at index `i + 2` and references the same receipt. There is **exactly one** instruction between them.
   - That instruction's `program_id` is in a constant `JUPITER_PROGRAM_IDS` set, taken from the `swapInstruction.programId` the spike observes (`JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`, [U]).
   - Its _only_ signer meta is the follower.
   - Its account metas include both `follower_quote` and `follower_base`.
   - These checks stay generic. They don't parse Jupiter's account layouts, because Jupiter has several route variants.
3. **Why exactly one instruction.** If two Jupiter instructions were allowed, a second wallet the attacker controls could swap _into_ the follower's base account, while the follower "buys" from it at a chosen ratio. The net balance changes would look like an in-range buy at any market price. With one swap signed only by the follower, the balance changes _are_ that swap.
4. **What else is ruled out:**
   - No top-level token transfers between the snapshots.
   - No nested pairs.
   - No Pending receipt can persist. A begin without a finish fails, and the transaction is atomic.

**Plain English:** `begin_follow` takes a photo of your two token balances. Exactly one Jupiter swap, signed only by you, runs. `finish_follow` takes a second photo and stores the difference. The program refuses any transaction where anything else could happen between the photos, or where another program is calling it.

**Instruction order.** It fits Jupiter's documented order: compute budget → setup → pre-swap → swap → post-swap → cleanup.

1. The Jupiter compute-budget instructions. **Replace** their unit-limit instruction; don't duplicate it, because a duplicate is a transaction error.
2. A Relay-added `createAssociatedTokenAccountIdempotent` for the follower's base and USDC ATAs.
3. `begin_follow`.
4. The Jupiter `swapInstruction`.
5. `finish_follow`.
6. Optionally, `closeAccount(follower's wSOL ATA)` to unwrap to native SOL.

Call `/build` with `wrapAndUnwrapSol=false` and an explicit `destinationTokenAccount = ATA(follower, base)`. This guarantees the output lands in the snapshotted account, never as native SOL.

Jupiter's `setupInstructions` and `cleanupInstruction` are replaced by the Relay instructions above. `otherInstructions` and `tipInstruction` must be empty: no tip is requested, and the server **fails closed** on anything it doesn't recognise. The spike dumps the real setup and cleanup for USDC→SOL to confirm that the replacement is equivalent.

**Duplicate prevention:**

- Receipt seeds include a client nonce, and `init` fails on reuse.
- One transaction holds exactly one pair.
- A transaction can't land twice: the signature is unique and the blockhash expires.
- The DB enforces `UNIQUE(tx_signature)` and `UNIQUE(receipt_pda)`.

**Expiry:**

- Uses `Clock::get()?.unix_timestamp`.
- The boundary is exclusive: `now >= expires_at` means expired, matching the prototype's tests.
- Validator clock drift is a few seconds and is documented as such.

**Errors (`error.rs`):**

- `PairNotSupported`, `InvalidBounds`, `InvalidWindow`, `PlanClosed`, `PlanExpired`, `PlanNotYetActive`, `StaleVersion`, `TooManyVersions`
- `InvalidInstructionLayout`, `UnexpectedInstructionBetweenSnapshots`
- `ReceiptNotPending`, `TokenAccountMismatch`
- `NoOutputReceived`, `NoInputSpent`, `InputAboveMax`
- `PriceAboveRange`, `PriceBelowRange`, `MathOverflow`

The app maps each to consumer text.

**Events:**

- `emit!` is used for _hints_ only.
- Jupiter transactions log heavily, and logs can be truncated, so the indexer **reads accounts as truth** and never depends on events.
- `emit_cpi!` is rejected for the MVP because it adds accounts to an already tight transaction.

**Token programs:**

- SPL Token (classic) only; Token-2022 is rejected by type. **Plain English:** a token account (ATA, Associated Token Account) is the per-wallet, per-token "balance row". Its address is derived from wallet + mint.
- Token-2022 extensions (transfer fees, hooks) would distort the measured balance changes, so they are deferred.

**Compute:**

- The pair adds roughly 25–40k CU (compute units, Solana's gas meter), to be measured.
- The server simulates the transaction with a 1.4M limit, then sets the limit to 1.2× actual, as Jupiter's docs recommend.

**Dependencies:**

- `anchor-lang = "1.1.2"` (1.2.1 is available; upgrade only if needed).
- Add `anchor-spl` (same version) for `Mint` and `TokenAccount`.
- `sha256`: use `solana_sha256_hasher::hashv` or its Anchor re-export. Verify the path under the Solana 3.x crates.

**Testing (LiteSVM, `program/programs/relay/tests/`):**

- **Mock swap program.** A tiny `program/programs/mock_swap` crate (test-only) is loaded **at the Jupiter program ID** with `svm.add_program(JUP_ID, bytes)`. It moves tokens between the follower's ATAs and a pool at a configurable price. The real anti-forgery rules are then exercised.
- **CPI attacker.** A `cpi_attacker` test program wraps `begin_follow`, to prove the top-level rule holds.
- **Shared test vector.** `domain/test-vectors/plan-hash.json` is read by the Rust tests (`include_str!`) and by the TS tests. Both must produce identical `terms_hash` values.
- **`mock-venue` Cargo feature.** It is off by default and **never in release builds**. It adds `mock_swap`'s own address to `JUPITER_PROGRAM_IDS`, and is used only by Fallback B (W).

---

## L. Backend design (Hono, `server/src/`)

```
server/src/
  index.ts              compose app; export default { port, fetch } (unchanged shape)
  env.ts                typed env (fails fast): APP_ORIGIN, DATABASE_URL, SOLANA_RPC_URL, SOLANA_CLUSTER,
                        JUPITER_API_KEY, JUPITER_BASE_URL=https://api.jup.ag, INDEXER_ENABLED, DEMO_MODE
  db/ client.ts (Bun's built-in Bun.sql Postgres client — decided; no driver swap mid-sprint), migrate.ts   server/migrations/*.sql
  middleware/ origin.ts (CSRF), rate-limit.ts, session.ts, errors.ts (problem+json), body limit
  routes/ health.ts auth.ts feed.ts plans.ts creators.ts prices.ts follow.ts me.ts search.ts
  services/ jupiter.ts prices.ts solana.ts (Connection + Anchor Program from synced IDL) commit.ts receipts.ts
  indexer/ loop.ts reconcile.ts
  seed/ demo.ts (labelled fictional creators + illustrative historical plans)
  idl/  (written by sync-idl)
```

### Routes

Each route is mounted at `/x` and reached publicly at `/api/x`.

| Method and path                                                                         | Auth                                         | Purpose                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`, `GET /health/indexer`                                                    | —                                            | Liveness, plus `{lastSlot, lagSlots, lastError}` for the indexer                                                                                                                                                     |
| `POST /auth/challenge {address}`                                                        | rate limit                                   | Creates a nonce and returns a SIWS input (`domain`, `address`, `statement`, `uri`, `version:"1"`, `chainId`, `nonce`, `issuedAt`, `expirationTime` +5 min) plus the exact fallback message text                      |
| `POST /auth/verify {nonce, signIn?: {signedMessage, signature, publicKey}, signature?}` | rate limit                                   | Consumes the nonce, then verifies with `verifySignIn` (`@solana/wallet-standard-util`) or ed25519 over the stored fallback text. Sets the cookie.                                                                    |
| `POST /auth/logout`, `GET /auth/session`                                                | session                                      | —                                                                                                                                                                                                                    |
| `GET /feed?cursor&pair`                                                                 | —                                            | Ranked cards with live status and evidence summary                                                                                                                                                                   |
| `GET /plans/:planPda`                                                                   | —                                            | Full plan, versions, receipts, failed attempts, comparison                                                                                                                                                           |
| `POST /plans/:planPda/confirm {txSignature, version, content}`                          | — (the chain proves authorship) + rate limit | Reads the PlanVersion account (checks owner and discriminator). Validates the text and re-hashes it, accepting it only if it equals the onchain `content_hash`. Cross-checks `terms_hash`, then inserts. Idempotent. |
| `GET /creators/:address` / `PUT /creators/me`                                           | — / session                                  | Profile; the owner edits only their own row                                                                                                                                                                          |
| `GET /prices`                                                                           | —                                            | Reference prices plus `observedAt` (cache TTL 10 s, stale after 60 s)                                                                                                                                                |
| `POST /follow/quote {planPda, version, follower, quoteAmount}`                          | rate limit by IP and follower                | Builds the unsigned transaction (section Q). Returns the summary, `txBase64`, the simulation and `quoteExpiresAt`.                                                                                                   |
| `POST /follow/verify {txSignature}`                                                     | rate limit                                   | Fetches the transaction and the receipt account and upserts the execution. Idempotent.                                                                                                                               |
| `GET /me/executions?follower=`                                                          | —                                            | The follower's executions (public chain data)                                                                                                                                                                        |
| `GET /search?q=`                                                                        | —                                            | `ILIKE` on creator handle and name, and pair symbols. No search engine.                                                                                                                                              |

**Write protection.** `hono/csrf` skips JSON requests, so `middleware/origin.ts` does the following for every non-GET request:

- Requires `Origin == APP_ORIGIN`, or `Sec-Fetch-Site: same-origin`.
- Requires `Content-Type: application/json`, which forces a CORS preflight for cross-site attempts.
- Adds `bodyLimit` (16 KB).
- Adds `secureHeaders()`.

**Session cookie:** `relay_session`, `HttpOnly`, `Secure` (prod), `SameSite=Lax`, `Path=/`, 7-day expiry. Ownership checks always compare `session.address` against the row's `creator_address`, so two creators cannot edit each other's profiles. Onchain, `has_one = creator` independently prevents cross-account plan edits.

**Rate limiting:**

- An in-memory sliding window; a single process is enough for the MVP.
- The key is the client IP taken from the **right-most** `X-Forwarded-For` entry that Caddy appends. That fixes the prototype's spoofable left-most read.
- In dev it falls back to `getConnInfo`.
- Limits:

  | Endpoint          | Limit                         |
  | ----------------- | ----------------------------- |
  | `auth/*`          | 20/min/IP                     |
  | `follow/quote`    | 10/min/IP and 10/min/follower |
  | `plans/*/confirm` | 10/min/IP                     |
  | everything else   | 120/min/IP                    |

**Caching:**

- Prices: 10 s TTL plus in-flight dedup.
- Feed snapshot: 30 s.
- Jupiter `/build` is never cached, because quotes go stale.

**Notifications:** Later. A "watched plan changed status" alert needs Web Push or a service worker.

---

## M. Frontend design (TanStack Start, `app/src/`)

```
routes/
  __root.tsx        + viewport-fit=cover, theme tokens, <Providers> (QueryClient, WalletProvider client-only), <TabBar>
  index.tsx         Feed  (search: { plan?: string, sheet?: 'details'|'review' }) — loader SSRs page 1
  p.$planPda.tsx    Plan page (Layer 3) — SSR for share links/OG tags
  c.$address.tsx    Creator profile
  search.tsx        Search
  me.tsx            My Plans (Watching | Followed) — client-rendered (wallet-dependent)
  account.tsx       Wallet, sign-in, theme, demo-wallet controls (localnet only)
  publish.tsx       Creator composer (requires connected wallet; tx proves authorship) — new plan or ?revise=planPda
lib/  config.ts (API_URL='/api', CLUSTER), api.ts (typed fetch), solana.ts, program.ts (relay IDL),
      wallet.tsx (wallet-adapter providers), follow-machine.ts (review state machine), watchlist.ts
components/ feed/{Feed,PlanCard,StatusBlock,RangeBar,EvidenceLine,ActionRow}, sheets/{DetailsSheet,ReviewSheet},
            plan/{VersionTimeline,ComparisonPanel,EntryStrip}, ui/{Sheet,Button,Chip,Avatar(Sigil port)}
styles/ tokens.css (+ CSS modules per component; Vite supports them natively — no Tailwind added)
```

### New dependencies (each justified)

- **`@tanstack/react-query`:** infinite feed, price polling, cache invalidation after a follow. It is TanStack's own server-state library and is not currently used.
- **`@solana/wallet-adapter-react` and `-base`:** compatible with the existing web3.js v1 and `@anchor-lang/core`. Wallet Standard wallets are detected automatically. Its `signIn` method supports SIWS. There is no `-react-ui` (we draw our own picker sheet) and no `-wallets` bundle (too heavy).
- **`@solana/wallet-adapter-unsafe-burner`:** **localnet demo only**, behind `CLUSTER === 'localnet'` and visibly labelled "Local demo wallet".
- **`@relay/domain`:** the new workspace.
- Fonts via `@fontsource/*`.
- **Not added:** a second Solana SDK (Kit) during the demo, Tailwind, any state library beyond React Query, any gesture library.

**Wallet state:**

- Wallet-adapter context, wrapped in `<ClientOnly>` because wallet detection needs `window`. Import `polyfill.ts` before web3.js on the client.
- The SIWS session comes from `GET /auth/session`, stored in React Query.
- Connected-but-not-signed-in is a valid state: a user can follow without signing in. Sign-in is needed only to publish.

**Transaction state:** `follow-machine.ts` is a reducer (no library) with these states:

`idle → quoting → ready{quote, txBase64, expiresAt} → quote_expired → verifying_tx → awaiting_wallet → rejected | submitted{sig} → confirming → recorded{receipt} | failed{reason}`

- `verifying_tx` runs on the client.
  - It rebuilds the transaction locally with the shared `composeFollowTx`, using the server-proxied `/build` response.
  - It asserts the exact instruction shape from Q step 7.
  - A plain "allowed programs" list is **not** enough, because a malicious server could insert a System or Token transfer.
- On `failed`, map the Relay error codes and the Jupiter slippage error to plain text.

**Forms and validation:**

- The publish composer uses the domain validators (the same code runs in the server).
- Amounts are entered as decimal strings and parsed with `parseUnits` (ported).
- There is no `<input type=number>` float path.
- Window presets are 15 min / 1 h / 6 h / 24 h / 3 d.

**SSR and data:**

- Route loaders call `createServerFn` handlers that fetch `INTERNAL_API_URL` (server-only env; `http://server:3001` in Compose, `http://127.0.0.1:3001` in dev).
- Personalized views (`/me`, `/account`) render on the client.

---

## N. Wallet authentication (SIWS)

1. **Challenge.** The client calls `POST /api/auth/challenge {address}`. The server:
   - validates the base58 address (32 bytes);
   - creates a 128-bit random nonce, alphanumeric and at least 8 characters;
   - stores `{nonce, address, siws_input, expires_at = now+5 min}`.

   The input contains:
   - `domain = host(APP_ORIGIN)`, taken from config and **never from request headers**;
   - `uri = APP_ORIGIN`, `version "1"`;
   - `chainId` (`solana:mainnet` / `devnet` / `localnet` mapped);
   - `issuedAt`, `expirationTime`;
   - `statement` = "Sign in to Relay. This proves you control this address. It is not a transaction and moves no funds."

2. **Sign.** If the wallet supports `solana:signIn`, call `signIn(input)`. Otherwise call `signMessage(utf8(fallbackText))`, where the text is server-built in SIWS format.
3. **Verify.** `POST /api/auth/verify`. The server:
   - **atomically consumes** the nonce, so it is single-use even when verification fails;
   - checks it is unexpired;
   - checks the address matches;
   - verifies the signature: either `verifySignIn(storedInput, output)`, which re-derives the message and checks the domain, nonce and address, or `ed25519.verify(sig, storedText, pubkey)`.
4. **Session.** The server:
   - creates a random 32-byte token and stores only its SHA-256;
   - sets the cookie (L);
   - upserts the `creators` row.

**Replay prevention:**

- single-use nonce;
- 5-minute expiry;
- domain binding (a signature made for `evil.com` doesn't verify here);
- the address bound into the nonce row;
- session tokens are random and stored hashed.

**How this differs from transaction signing:**

- SIWS signs a _text message_ that the Solana runtime can never execute. It costs nothing and moves nothing. It only proves "the holder of this key is here now".
- A _transaction_ signature authorizes specific instructions (the swap) and is checked by the network.
- Relay never asks for a message signature to authorize a trade, and a session never authorizes a transaction.

**Wallet link honesty:** the profile says "Linked wallet (verified by signature): 1. Relay sees only activity from linked wallets through Relay receipts."

---

## O. Plan commitment design

**Canonical content hash.** It is computed offchain, by the client and the server. It is binary, not JSON, so key order, number formatting and escaping can't create ambiguity:

```
content_hash = SHA-256(
  "relay:plan-content:v1"                      (ASCII, no length prefix; fixed tag)
  || u32_le(len(rationale_utf8))   || rationale_utf8        // ≤ 1000 bytes
  || u32_le(len(exit_thesis_utf8)) || exit_thesis_utf8      // ≤ 500 bytes
  || u8(has_exit_target)  || u64_le(exit_target_price)      // presence flag (not "0 = none"); value 0 when absent
  || u8(has_invalidation) || u64_le(invalidation_price)     // prices in quote atomic units per 1 whole base
)
```

**Canonicalize by rejecting, never by transforming.** Bun (JavaScriptCore) and browsers (V8) can ship different Unicode/ICU versions, so silently normalizing text could produce different bytes. Instead, validation rejects text that:

- isn't already NFC (`s !== s.normalize('NFC')`);
- has surrounding whitespace (`s !== s.trim()`);
- isn't well-formed (`!s.isWellFormed()`, which catches lone surrogates);
- contains NUL, which Postgres can't store;
- exceeds the byte limits.

Accepted text is hashed as its exact UTF-8 bytes. Rust never computes `content_hash`.

**Canonical terms hash.** It is computed **onchain** by `create_plan`/`revise_plan` and recomputed by `@relay/domain`:

```
terms_hash = SHA-256(
  "relay:plan-version:v1" || relay_program_id(32) || plan_pda(32) || u16_le(version)
  || creator(32) || base_mint(32) || quote_mint(32) || u8(base_decimals) || u8(quote_decimals)
  || u64_le(entry_low) || u64_le(entry_high) || i64_le(expires_at_unix_seconds)
  || content_hash(32) || prev_terms_hash(32)          // zeros for v1
)
```

- **Price unit:** every price is a `u64` in **quote atomic units per one whole base token**. For example, $183.20 for 1 SOL with USDC (6 decimals) is `183_200_000`.
- **Time:** expiry is in **seconds**, because the chain clock is in seconds. The UI converts.
- **No floats anywhere in protocol paths.**

**Flow.** There are no server-side drafts; the chain itself proves who wrote the plan.

1. The creator fills in the composer.
2. The client validates the text with `@relay/domain` and computes `content_hash` locally.
3. The client builds `create_plan` / `revise_plan`, and the wallet signs and sends it.
4. After confirmation, the client calls `POST /plans/:pda/confirm {txSignature, version, content}`.
5. The server reads the `PlanVersion` account and checks that its owner is Relay and its discriminator is correct.
6. The server re-validates and re-hashes the text. It **accepts the text only if the hash equals the onchain `content_hash`**, cross-checks `terms_hash`, and inserts `plan_versions`.

No session is needed to publish: only the creator's key could have created that account.

The indexer also discovers versions independently. If a version appears onchain **without matching text in the DB**, it is shown as "Version 3 committed onchain · text unavailable". It is never hidden.

`ref_price_at_publish` comes from the `price_observations` row nearest the **onchain `published_at`**, not the time of `/confirm`. This stops a creator from picking a flattering moment by delaying confirm.

**Immutable history:**

- Onchain, PDAs cannot be rewritten and `prev_terms_hash` chains each version to the last.
- In the DB, a trigger rejects UPDATE and DELETE on `plan_versions`.
- Moderation (legal takedowns) would replace the _displayed_ text with a tombstone that keeps the hash. It never deletes rows.

**Hash-collision assumption:** SHA-256 collision resistance. The domain tags separate the two hash types. Including the program ID and plan PDA prevents copying a commitment across deployments or plans.

---

## P. Entry eligibility

There are three tiers. **Each tier is labelled with its own name; they are never merged into one.**

| Tier                                 | Input                                                                                                                                                                 | Where                                                                          | Authority                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 1. **Feed status** (advisory)        | Jupiter Price API v3 `usdPrice` for the base (USDC ≈ $1 assumed; documented), converted _by string parsing_ to integer quote units; `observedAt`; plan version; `now` | `@relay/domain.entryStatus()` on the server (ranking) and the client (display) | **None.** It shows "Price may be outdated" after 60 s.                               |
| 2. **Your-size check** (pre-signing) | `/build`'s `inAmount` and `outAmount` for the user's amount; `otherAmountThreshold`                                                                                   | Hono `follow/quote`, shown in Review                                           | Advisory, plus the **Jupiter minimum output** protects the user against worse fills  |
| 3. **Execution check** (binding)     | Actual token-account balance changes in the same transaction                                                                                                          | `finish_follow`                                                                | **Authoritative.** If it fails, the whole transaction reverts and no receipt exists. |

**Domain function:**

`entryStatus({ version, plan, price: {quoteUnits, observedAtMs} | null, nowMs, staleAfterMs = 60_000, closingSoonMs = 600_000 })`

It returns `{status, closingSoon, msUntilExpiry}`. The order of checks is:

1. `closed`
2. `expired` (`now >= expiresAt`)
3. `price_unavailable` / `price_stale`
4. `below_range` / `above_range` / `in_range`, using bigint comparisons

The order is tested exhaustively, including exact boundaries.

**Your-size effective price** = `inAmount × 10^baseDec / outAmount`, rounded up for a conservative display. For the bound check, the server compares `minOut` against `ceil(in × 10^baseDec / entry_high)`:

- If even the minimum output would breach the plan's high bound, Review says "At your amount the price would be above the plan's entry" and suggests a smaller amount.
- If only the expected fill is inside, it warns "May fail if the price moves; no receipt will be created".

**Fee and edge effect.** The effective price includes AMM and route fees, typically about 0.1–0.3% above the reference price. A reference price just under `entry_high` can therefore still fail at execution.

- Tier 2 warns "**Near the top of the plan range — may fail**" when the expected price is within 0.5% of `entry_high`.
- `PriceBelowRange` gets its own wording ("Price is under the plan's entry — the creator's thesis may be broken"). It is distinct from slippage failures.

**Trust assumptions:**

- Tier 1 trusts Jupiter's price aggregation and the USDC peg.
- Tier 2 trusts Jupiter's routing and the server.
- Tier 3 trusts only the Solana runtime and our program, because the balance changes are physical facts.

Tier 3 does **not** prove the fill happened at the market price. Jupiter can route through a permissionless pool that the user created, at any in-range price. This is handled offchain by flagging an "off-market fill" (S, T).

---

## Q. Jupiter execution (Swap API v2 `/build`; `/order` can't be modified)

1. **Review.** The client sends `POST /api/follow/quote {planPda, version, follower, quoteAmount}`, with the amount as a decimal string.
2. **Server pre-checks.** The server parses the amount with `parseUnits` (6 decimals) and checks that:
   - the plan exists, is open and `version == latest`;
   - `now < expires_at − 20 s` (a safety margin);
   - the follower is a valid pubkey;
   - the amount is between the minimum and the demo cap.
3. **Fetch the route.** `GET https://api.jup.ag/swap/v2/build` with:
   - `inputMint=USDC`, `outputMint=base`, `amount`, `taker=follower`;
   - `slippageBps` (50 on mainnet, 100 on the fork);
   - `maxAccounts` (start at 40, tuned in the spike);
   - `transactionVersion=0`, `wrapAndUnwrapSol=false`, `destinationTokenAccount=ATA(follower, base)`, `x-api-key`.

   The server fails closed if `otherInstructions` or `tipInstruction` are non-empty.

4. **Compose with shared code.** `@relay/domain/tx` exports `composeFollowTx({buildResponse, plan, version, follower, nonce, blockhash, cuLimit, cuPriceCap})`. It:
   - builds the exact instruction order from K;
   - maps `addressesByLookupTableAddress` to `AddressLookupTableAccount`s, so no extra RPC call is needed;
   - calls `compileToV0Message`.

   **The server and the client run the same function.** This is the only part of `domain/` that depends on `@solana/web3.js`, and it lives in a separate subpath so the core stays dependency-free.

5. **Simulate.** `simulateTransaction` with `sigVerify:false, replaceRecentBlockhash:true` and a 1.4M CU limit. Then set the limit to `ceil(used × 1.2)`. If the simulation fails, return a mapped reason (for example `PriceAboveRange`) and **nothing to sign**.
6. **Respond** with two things:
   - **The Review summary:**
     - the pay and receive amounts, the minimum, and the effective price against the range;
     - the plan and version;
     - fees: network fee, priority fee and receipt rent;
     - the route labels;
     - `quoteExpiresAt` (about 30 s, bounded by blockhash validity).
   - **The compose inputs:** the raw `buildResponse`, `blockhash`, `lastValidBlockHeight`, `cuLimit` and `nonce`.
7. **Client check.**
   - The client calls `composeFollowTx` itself with the reviewed plan, version and amount, so it signs a transaction it built.
   - Before signing, it asserts this exact shape: compute budget, ATA creation for the follower's _own_ ATAs, `begin_follow` (reviewed plan, version and follower), exactly one instruction from `JUPITER_PROGRAM_IDS` whose only signer is the follower, `finish_follow`, and optionally `closeAccount` on the follower's own wSOL ATA.
   - Anything else, including any System or Token transfer, means the client refuses to sign.
   - Otherwise the user taps **Approve in wallet**, and the wallet calls `signTransaction`.
8. **Broadcast.** The client sends the signed transaction to `VITE_RPC_URL` with `sendRawTransaction(skipPreflight:false)`, then confirms with `confirmTransaction({signature, blockhash, lastValidBlockHeight}, 'confirmed')`.
9. **Verify.** The client calls `POST /api/follow/verify {txSignature}`. The server:
   - fetches the transaction at `confirmed` and checks there is no error;
   - checks the transaction calls the Relay program;
   - derives the receipt PDA from the instruction accounts;
   - fetches the receipt account, checking the **owner is the Relay program** and the **discriminator is FollowReceipt**, and that its status is Recorded;
   - upserts `executions`.

   If the transaction failed, it upserts an execution with `status='failed'` and the decoded error. The server never trusts client-supplied amounts.

10. **Index.** The indexer later reconciles the execution at `finalized` (R).

**Account and size budget.** A v0 transaction has 1232 bytes. Each new static key costs 32 bytes. The Relay keys are:

- the Relay program;
- the plan, version and receipt accounts;
- the instructions sysvar, which can move into a small Relay-owned lookup table if space is tight.

`begin` also adds about 26 bytes of data. **The spike measures the real size offline, with the real begin and finish account lists**, not with a no-op instruction.

If the build fails or the transaction is too large, retry with a lower `maxAccounts` (32, then 24). If it still doesn't fit, report "Route too complex — try a smaller amount" (`unsupported_route`).

**Why not CPI into Jupiter:**

- Jupiter's docs say CPI can't use lookup tables and adds compute.
- Top-level composition keeps Jupiter's lookup tables and its own minimum-output enforcement.
- Our atomic snapshot pair gives the same guarantee: the receipt exists iff the in-range swap happened.

**Fee note:** `/build` charges no Jupiter swap fee. Relay takes **no fee** in the MVP.

**Network specifics (Surfpool fork):**

- Quotes come from mainnet state.
- The fork lazily clones the accounts on first touch, so the state is close to mainnet.
- The higher slippage covers drift.
- Test USDC is funded with Surfpool's token-account cheatcode. The exact RPC method names must be verified in the spike, and the faucet is labelled "Local test funds".

---

## R. Outcome indexing (`server/src/indexer`)

**MVP (local and devnet scale).** Runs in the Hono process when `INDEXER_ENABLED=true`, every 5 s:

1. **Account sync.** `getProgramAccounts(relayId, {filters:[memcmp discriminator]})` for Plan, PlanVersion and FollowReceipt. Upsert by PDA. Account state is the source of truth; this is idempotent by construction.
2. **Signature sync** (for failed attempts and transaction metadata):
   - Call `getSignaturesForAddress(relayId, {until: checkpoint.last_signature, limit: 1000})` and page backwards with `before` until reaching `until`.
   - Process oldest-first: `getTransaction(sig, {maxSupportedTransactionVersion:0, commitment:'finalized'})`.
   - Decode the Relay instructions and upsert `executions` by `tx_signature`, either as recorded (cross-checked against the receipt account) or as failed with the error code.
   - Advance the checkpoint **after** the database commit, in the same database transaction as the upserts.
3. **Retries.** Exponential backoff on RPC errors. `last_error` is shown at `/health/indexer`. The UI shows "Results delayed" when lag is over 60 s.
4. **Backfill.** On an empty checkpoint, page back to the program's first signature.
5. **Duplicates.** Rows are keyed by signature and PDA, and the "recorded" status is never downgraded. Reprocessing is harmless.

**Commitment:**

- `confirmed` is shown immediately, with a "Confirming" tag.
- `finalized` is required before an execution counts in analytics. **Plain English:** confirmed means a supermajority voted for the block, and it's very rarely rolled back. Finalized means it can't be rolled back.

**Production (later):**

- A Yellowstone gRPC stream (Helius or Triton) for low latency.
- The polling above stays as the reconciliation and backfill path.
- The indexer moves to its own Compose service (same image, different command) so web restarts don't stall it.

---

## S. PnL and attribution methodology (defined before any number is shown)

- **Attribution unit:** one `FollowReceipt` is one **lot**, attributed to (plan, version, follower wallet). Only receipts count. Wallet activity outside Relay is **never** attributed.
- **Cost basis:** `quote_spent` (USDC atomic) from the receipt. This is the actual balance change and already includes route and AMM fees. Network and priority fees (SOL) are reported **separately** as "Network fees". They are not folded into the basis in the MVP; this is stated.
- **Entry price:** `quote_spent × 10^base_dec / base_received`.
- **Open result (estimate):** `base_received × current_reference_price − quote_spent`, labelled "**Estimated, open position**". It assumes the follower still holds the lot.
- **Holding check:** if the wallet's current base balance is below the sum of its open Relay lots, the lots are marked "**Position may have moved or been sold outside Relay — result unknown**". The estimate is then excluded from the medians. Incoming transfers never increase any lot.
- **Realized result (Later, Phase 13):** only through an `exit_follow` receipt, the mirror pair (sell base for quote) linked to an entry receipt.
  - Partial exits reduce `base_remaining` FIFO within the lot.
  - Realized = `quote_received − quote_spent × (base_sold / base_received)`, using u128 math and rounding toward zero.
  - Exits outside Relay are "unknown", not losses or gains.
- **Multiple buys:** separate lots. Plan-level stats aggregate lots by wallet (volume-weighted entry per wallet), then take medians across wallets, so one wallet with 20 buys doesn't dominate.
- **Creator observed:** the creator's own receipts on their plan, shown separately and **excluded from follower stats**.
- **Off-market fills:** when the server verifies a receipt, it compares the effective price with the reference price from `price_observations` nearest that slot.
  - Fills more than 150 bps away (tunable) are flagged "**Off-market fill**".
  - Flagged fills are shown but **excluded from medians and from the creator-observed entry**.
  - Why: Jupiter can route through a permissionless pool that the user controls, so the onchain range check alone cannot stop staged entries.
- **Simulated plan reference:** entry at `ref_price_at_publish` (the Jupiter price observed by the server at commit time; source and time stored), marked to the current price. Labelled "**Simulated: if entered at publication price, no fees**".
- **Missing data:** if the indexer lag is over 60 s, or the price is stale, results show the banner and the stats freeze with the date they were computed. Any wallet with "unknown" lots is counted under "n wallets with unknown outcome".

**Display rules:**

- Always "wallets", never "people" or "followers" as humans.
- n < 3: list the entries individually.
- n ≥ 3: median and min–max.
- n ≥ 10: also the interquartile range.
- No "win rate" in the MVP.
- Fees and slippage are shown as medians in bps relative to the reference price.
- Sample size is shown next to every statistic.

---

## T. Security model

**Trust boundaries:**

- The browser (untrusted)
- The Hono server (trusted for convenience, _not_ for receipts)
- Postgres
- Jupiter (an external, untrusted route builder)
- The RPC (trusted for reads, but transactions are re-verified)
- The Relay program (authoritative)
- The wallet (the user's authority)

| Threat                                                                                                                                                               | Program                                                                                                                                    | Backend                                                                                         | Frontend                                                                                                                        | Cannot fully prevent                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Creator rewrites offchain text                                                                                                                                       | `content_hash` committed                                                                                                                   | text re-hash checked on confirm; insert-only trigger                                            | shows "verified ✓ / mismatch"                                                                                                   | DB admin tampering is _detectable_, not preventable                                       |
| Nonce replay / cross-site sign-in                                                                                                                                    | —                                                                                                                                          | single-use atomic consume, 5 min TTL, domain from config                                        | —                                                                                                                               | phishing sites asking users to sign _their own_ messages                                  |
| Cross-account edits                                                                                                                                                  | `has_one = creator`                                                                                                                        | session.address == row owner                                                                    | —                                                                                                                               | —                                                                                         |
| Fake wallet ownership                                                                                                                                                | —                                                                                                                                          | ed25519 verify                                                                                  | —                                                                                                                               | the key holder could be anyone (a shared key)                                             |
| Duplicate or skipped version                                                                                                                                         | PDA `init` on `latest+1`; hash chain                                                                                                       | PK (plan, version)                                                                              | —                                                                                                                               | —                                                                                         |
| Malicious client posting outputs                                                                                                                                     | ignores client data; reads balances                                                                                                        | never accepts amounts from clients                                                              | —                                                                                                                               | —                                                                                         |
| Spoofed receipt (standalone instruction, token shuffle, second wallet swapping into the follower's ATA)                                                              | one pair per transaction; **exactly one** Jupiter instruction between begin and finish; the follower is its only signer; ATA-only accounts | verify owner, discriminator and status                                                          | —                                                                                                                               | —                                                                                         |
| Receipt forged through CPI (an attacker's program wraps `begin_follow`)                                                                                              | stack height == top level; the current top-level instruction must be Relay's own                                                           | —                                                                                               | —                                                                                                                               | —                                                                                         |
| Staged fill (the user routes Jupiter through their own permissionless pool at an in-range price; a creator fakes an "observed entry"; sock-puppet wallets pad stats) | — (no onchain fix)                                                                                                                         | "off-market fill" flag: compare against the reference price at that slot and exclude from stats | label "Off-market fill"                                                                                                         | cannot be fully prevented; it is detected and excluded                                    |
| Replayed or duplicate receipt                                                                                                                                        | `init` with a nonce; one pair per transaction                                                                                              | UNIQUE signature and PDA                                                                        | —                                                                                                                               | —                                                                                         |
| Stale price shown as live                                                                                                                                            | —                                                                                                                                          | stale after 60 s                                                                                | `price_stale` state, timestamps                                                                                                 | the seconds between poll and view                                                         |
| Low-liquidity manipulation                                                                                                                                           | allowlist of liquid mints                                                                                                                  | —                                                                                               | —                                                                                                                               | short-lived manipulation of large pools                                                   |
| Malicious token metadata                                                                                                                                             | mints hardcoded; no metadata rendering from chain                                                                                          | symbols from our allowlist                                                                      | —                                                                                                                               | —                                                                                         |
| Token-2022 extensions                                                                                                                                                | rejected by type                                                                                                                           | —                                                                                               | —                                                                                                                               | —                                                                                         |
| RPC failure or simulation mismatch                                                                                                                                   | atomic revert                                                                                                                              | retries, mapped errors                                                                          | explicit states                                                                                                                 | landing failures under congestion                                                         |
| Indexer delay                                                                                                                                                        | —                                                                                                                                          | lag metric                                                                                      | "Results delayed"                                                                                                               | —                                                                                         |
| User bypasses the frontend                                                                                                                                           | **all binding checks are onchain**                                                                                                         | —                                                                                               | —                                                                                                                               | users trading outside Relay (simply not attributed)                                       |
| Creator hides losing history                                                                                                                                         | no close or delete for versions; plans only "Closed"                                                                                       | no delete API                                                                                   | closed and expired plans stay in the feed for 24 h and on the profile forever                                                   | a creator deleting their offchain _account_ (keep a tombstone)                            |
| Server builds a malicious transaction                                                                                                                                | —                                                                                                                                          | —                                                                                               | the client rebuilds the transaction with the shared `composeFollowTx` and checks the exact shape; plus the wallet's own preview | a fully compromised frontend bundle                                                       |
| Fork transaction replayed on mainnet (if the fork ever serves a real blockhash)                                                                                      | —                                                                                                                                          | —                                                                                               | —                                                                                                                               | **Never sign fork transactions with keys that hold mainnet funds.** Use burner keys only. |
| XSS through rationale                                                                                                                                                | —                                                                                                                                          | length limits; text only                                                                        | React escaping; no `dangerouslySetInnerHTML`                                                                                    | —                                                                                         |

**Program upgrade authority:**

- Localnet uses a dev key.
- Before mainnet, move it to a multisig, back up the program keypair (`DEPLOYMENT.md` already warns), and plan an external review.

**Things to treat carefully:**

- Never log signatures or session tokens.
- `.env` stays git-ignored.

---

## U. Testing strategy

| Layer              | Tool                                                                                  | Must cover                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain (`domain/`) | `bun test`                                                                            | `parseUnits`/`formatUnits` matrix (port the prototype tests); `entryStatus` order and exact boundaries (expiry ==, price == low/high, stale ==); u64 overflow guards; `content_hash`/`terms_hash` test vectors, including NFC vs NFD input, field-swap sensitivity and version chaining; effective-price rounding                                                                                                                                                                                                                                                                                                                                                                                                          |
| Hono               | `bun test` + `app.request()`, test DB `relay_test`                                    | SIWS happy path; replay; burned nonce on failure; expired; wrong domain; wrong address; cross-account profile edits (403); confirm with text whose hash ≠ onchain `content_hash` (409); confirm for an account not owned by Relay (400); missing Origin or `text/plain` POST (403); rate-limit 429; body limit 413; confirm with a mismatched hash (409); confirm idempotency; verify with a failed transaction gives a failed row; verify never trusts body amounts                                                                                                                                                                                                                                                       |
| Rust / Anchor      | LiteSVM (`cargo test` through `bun run program:test`) + `mock_swap` at the Jupiter ID | signer and `has_one`; PDA seeds; v1 twice (fails); revise skip or duplicate; revise by another key; closed plan; window min and max; pair not allowed; Token-2022 mint; expiry boundary (`warp` the clock); stale version; begin without finish; two pairs in one transaction; a token transfer between the snapshots; **two Jupiter instructions between begin and finish (the second-wallet attack)**; a swap instruction with an extra signer; a non-ATA token account; **begin called through CPI (`cpi_attacker`)**; finish with swapped accounts; no output; price above or below range by 1 unit; `max_quote_in` exceeded; u128 math at the u64 extremes; receipt nonce reuse; **the TS and Rust hashes are equal** |
| Integration        | `scripts/e2e-surfpool.ts` (Bun)                                                       | Surfpool fork: create plan → quote → sign with a keypair → receipt recorded; expired plan raises a program error; above-range amount fails with no receipt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| E2E                | Playwright (playwright-cli skill), 390×844 viewport, burner wallets                   | Feed snaps; status labels visible; watch works without a wallet; review → approve → recorded; failure messaging; keyboard navigation; reduced-motion run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Accessibility      | axe in Playwright + manual screen-reader pass of the card and review sheet            | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

---

## V. Observability (lightweight)

- **Logs:**
  - `hono/request-id` and `hono/logger`, written as JSON lines.
  - One structured log per follow attempt: `{reqId, planPda, version, follower(short), stage, jupiterRouteLabels, simulateCU, errorCode}`.
  - Never log tokens or signatures of messages.
- **Indexer health:** `/api/health/indexer` reports the lag in slots and seconds, the last error and the counts processed.
- **Failed swaps:** `executions.status='failed'`, grouped by error, give a daily count query in `docs/`.
- **RPC problems:** a counter per RPC method and error, plus a health banner trigger.
- **Analytics integrity check:** a script recomputes plan stats from `executions` and compares them with the served values. It runs in CI later.
- **Frontend:** `window.onerror` / `unhandledrejection` POST to `/api/client-errors` (rate-limited). Later.

---

## W. Implementation phases

The work is split into small phases that can each be handed to one coding session. Every phase:

- has one focus;
- lists the files it touches;
- ends with a **Done when** check that someone else can verify;
- is not started until the phases it depends on are done.

**Stage 1 (Phases 0–9) is the 72-hour demo**, about 65 hours of work plus a buffer. Phases on different tracks can run in parallel:

| Track    | Phases |
| -------- | ------ |
| Program  | 2 → 3  |
| Backend  | 4 → 5  |
| Frontend | 6 → 7  |

**Stage 2 (Phases 10–18) is the post-demo MVP.**

### Stage 1: the 72-hour demo

#### Phase 0: Spike and go/no-go (≈ 3 h, depends on nothing): DONE 2026-10-09, result A′

- **Goal:** prove that real Jupiter swaps work on a Surfpool fork before building on that assumption.
- **Tasks:**
  - [x] Start a Surfpool mainnet fork in WSL.
  - [x] Fund a burner keypair with USDC using the cheatcode, and record the real method name.
  - [x] Land an **unmodified** `/build` USDC→SOL swap.
  - [x] Dump `swapInstruction.programId`, `setupInstructions`, `cleanupInstruction`, `otherInstructions` and `tipInstruction`.
  - [x] Compile the message **offline with the real begin/finish account lists**, and measure its bytes and compute units (CU).
- **Files:** `docs/spikes/surfpool-jupiter.md` (new), plus a throwaway script.
- **Done when:** the spike doc records **GO**, **A′** or **B**:
  - **GO:** every task succeeds.
  - **A′:** the fork with restricted dexes, needed when oracle-based private AMMs fail on stale fork state.
  - **B:** the Surfpool fork with the real mints, but the swap is done by `mock_swap` under the `mock-venue` feature, labelled "Simulated swap venue (local)" everywhere.
- **Result:** **A′.** Real Jupiter swaps land on the fork only with a venue allowlist (`dexes=Orca V2,Raydium CLMM,Meteora DLMM,Raydium`); the unrestricted route failed inside GoonFi V2. Full findings are in [spikes/surfpool-jupiter.md](spikes/surfpool-jupiter.md). Consequences for later phases:
  - add a fork-only `JUPITER_DEXES` setting (Phase 5);
  - demo plans must use **chain time** (Clock sysvar), not wall-clock time, because the fork clock was ahead of wall-clock (Phases 3, 4 and 8);
  - the JUP/USDC transaction is 1,171 of 1,232 bytes, so tune `maxAccounts` or use a Relay lookup table for the sysvar (Phase 3).

#### Phase 1: Shared domain package (≈ 4 h, can run alongside Phase 0): DONE

- **Goal:** one source of truth for money math, hashing and entry status.
- **Tasks:**
  - [x] Create the `domain/` workspace and add it to the root `workspaces`.
  - [x] `amounts.ts`: port from the prototype, with its tests.
  - [x] `price.ts`: u64 price units and effective price.
  - [x] `commitment.ts`: binary content and terms hashes, with reject-not-transform text validation.
  - [x] `entry-status.ts`.
  - [x] `test-vectors/plan-hash.json`.
- **Files:** `domain/**`, root `package.json`.
- **Done when:** `bun test` in `domain/` is green, including the exact boundaries and the hash vectors.
- **Result:** 39 tests pass (`bun test` in `domain/`) and `tsc` is clean. Beyond the listed files the package also has `assets.ts` (the SOL/JUP/USDC allowlist), `bytes.ts` (little-endian writers, base58, hex, SHA-256), `plan-terms.ts` (window and bound validation) and `scripts/gen-vectors.ts`. The vectors are cross-checked against an independent Node `Buffer`/`crypto` reconstruction; the Rust program must reproduce them in Phase 2. Both Dockerfiles now copy `domain/`.

#### Phase 2: Program, part 1: plan commitments (≈ 4 h, depends on Phase 1): DONE

- **Goal:** plans and append-only versions exist onchain.
- **Tasks:**
  - [x] Rename `course_program` to `relay` (new keypair, `anchor keys sync`, LiteSVM `.so` path).
  - [x] Accounts: `Plan`, `PlanVersion`.
  - [x] Instructions: `create_plan`, `revise_plan` (`close_plan` if time allows).
  - [x] The onchain `terms_hash`.
  - [x] LiteSVM tests: signer, `has_one`, seeds, duplicate or skipped versions, window and pair rules, expiry boundary, TS hash == Rust hash.
  - [x] Update `sync-idl.ts`, `app/src/lib/program.ts` and `app/src/idl/*`.
- **Files:** `program/**`, `scripts/sync-idl.ts`, `app/src/lib/program.ts`, `app/src/idl/*`.
- **Done when:** `bun run program:test` and `bun run build:app` are both green.
- **Result:** 19 LiteSVM plan-lifecycle tests and 2 vector tests pass (`bun run program:test`), including Rust reproducing every TypeScript hash. `close_plan` shipped too. Program ID: `Dzm5tgMCdhJZfXeHYuALst4hvZYiCebfyKf1ctx6WBF6` (new keypair, in `program/target/deploy/`; back it up before any real deploy). Notes for later phases:
  - Builds on `/mnt/c` hang in disk wait, so `scripts/anchor.ts` now builds in `~/.cache/relay-target` (WSL) and copies `deploy/`, `idl/`, `types/` back to `program/target/`.
  - `anchor build` also compiles the integration tests (the IDL step runs `cargo test`), so a test compile error fails the build.
  - `anchor-spl` needs its `token_2022` feature for `idl-build` to compile; the program still uses only the classic `token::Mint`, so Token-2022 mints are rejected by type.
  - `sync-idl` copies the IDL to `app/src/idl/` and `server/src/idl/`.

#### Phase 3: Program, part 2: verified follow receipts (≈ 6 h, depends on Phases 0 and 2): DONE

- **Goal:** a receipt can exist only if a real in-range swap happened.
- **Tasks:**
  - [x] `FollowReceipt`, plus `begin_follow` / `finish_follow` with the top-level and exactly-one-swap rules.
  - [x] Test crates `mock_swap` and `cpi_attacker`.
  - [x] The adversarial suite (section U).
  - [x] `domain/src/tx.ts` (`composeFollowTx`).
  - [x] `scripts/follow-demo.ts`, run on the fork.
- **Files:** `program/programs/{relay,mock_swap,cpi_attacker}/**`, `domain/src/tx.ts`, `scripts/follow-demo.ts`.
- **Done when:**
  - All the bypass, CPI and second-wallet tests pass.
  - The script prints a Recorded receipt with real route labels (or the "Simulated swap venue" label under B).
  - It then shows a **landed** `PlanExpired` failure.
- **Result:** 24 LiteSVM tests cover the anti-forgery rules (45 Rust tests in total), including a CPI attacker, a second-wallet swap, an extra signer, plain-transfer fakes and the exact range boundaries. `bun run --cwd domain demo:follow` runs the real thing on a Surfpool fork: a follow through a real Jupiter route records a receipt (100 USDC → ~0.91 SOL, 857-1014 of 1232 bytes), and after time travel the same follow fails onchain with `PlanExpired` and leaves no receipt.
- **Deviations from the plan text:**
  - **Kit replaces web3.js (owner decision).** `@solana/web3.js` v1 is deprecated, so the project uses `@solana/kit` 8.4 and no longer depends on `@solana/web3.js` or `@anchor-lang/core`. The program client (PDAs, account codecs, instruction builders, follow transaction composer) lives in `@relay/domain/solana`; tests check it against the generated IDL and the Rust program. This supersedes the "keep web3.js for the demo" decision in section B and the Kit-migration item in Stage 2 (Phase 17).
  - `composeFollowTx` is `domain/src/solana/follow-tx.ts` (not `domain/src/tx.ts`); the demo is `domain/scripts/follow-demo.ts`.
  - `sync-idl` now copies only the IDL, to `domain/src/solana/relay.idl.json`.
  - Receipt size is 8 + 132 bytes (the earlier estimate was 211).
  - Only the follower may sign the single swap instruction, and the program requires the exact layout described in `program/programs/relay/src/layout.rs`.

#### Phase 4: Backend foundation (≈ 6 h, depends on Phases 1 and 2): DONE

- **Goal:** the server knows about plans and can serve a feed.
- **Tasks:**
  - [x] Postgres in `compose.yaml`.
  - [x] Migrations and runner, using `Bun.sql`.
  - [x] `env.ts`.
  - [x] Origin middleware, body limit and secure headers.
  - [x] Vite `/api` proxy, and `config.ts` set to `API_URL='/api'`.
  - [x] `/plans/:pda/confirm` (hash-checked text).
  - [x] Price service (Jupiter Price v3, cached).
  - [x] `GET /feed` with entry status and ranking.
  - [x] `GET /plans/:pda`.
  - [x] On-demand `getProgramAccounts` sync.
  - [x] A seed script with labelled fictional creators.
- **Files:** `server/src/**`, `server/migrations/*`, `compose.yaml`, `app/vite.config.ts`, `app/src/lib/config.ts`.
- **Done when:**
  - `bun test` in `server/` is green.
  - A curl script runs: sign `create_plan` → confirm → `/api/feed` shows the plan with its status.
- **Result:** 42 server tests (Postgres plus an in-memory chain built with the real encoders) and the domain suite pass. Verified live against the Surfpool fork: `bun run --cwd server seed` publishes real onchain plans, the feed over HTTP ranks them (in range, then below range / original entry passed, then expired), a two-version plan shows its hash chain, and writes without the configured Origin get 403.
- **Deviations from the plan text:**
  - The chain facts and the text are separate append-only tables (`plan_versions` and `plan_version_content`) so a version can exist onchain without its text and be shown as "text unavailable" (section O).
  - `creators` has no foreign key from `plans`; a plan exists onchain whether or not its creator made a profile.
  - `DATABASE_DIRECT_URL` (migrations) is separate from `DATABASE_URL` (runtime), so a pooled runtime URL works later.
  - `entryStatus` tolerates up to 5 s of clock skew for a price observation (found while verifying live: a freshly fetched price looked like it came from the future).
  - The server needs `docker compose -f compose.dev.yaml up -d` for Postgres in development; `compose.yaml` gained a `postgres` service and requires `POSTGRES_PASSWORD` in `.env`.
  - `domain/src/solana/send.ts` holds the shared send-and-confirm helpers used by scripts.
  - The `test/` folders are now part of the tsconfigs, so tests are type-checked too.

#### Phase 5: Backend follow flow (≈ 4 h, depends on Phases 3 and 4): DONE

- **Goal:** the server can quote a follow and verify the result.
- **Tasks:**
  - [x] `POST /follow/quote`: `/build`, fail-closed checks, `composeFollowTx`, simulate, set the CU limit, then return the summary and compose inputs.
  - [x] `POST /follow/verify`: owner, discriminator and status checks; failed transactions recorded as failed.
  - [x] `GET /me/executions`.
  - [x] Rate limits.
- **Files:** `server/src/routes/follow.ts`, `server/src/services/{jupiter,receipts}.ts`.
- **Done when:** a script quotes, signs with a burner, sends, verifies and sees the `executions` row. A failed transaction produces a `failed` row.
- **Result:** 65 server tests pass in total (23 new for the follow flow). Verified live on the fork with `bun run --cwd server scripts/follow-via-api.ts`: a quote on a real Meteora route, a transaction the client rebuilt from the returned inputs and signed itself (857 of 1232 bytes), `POST /follow/verify` recording it as `recorded` with amounts read from the receipt account, the execution in `/me/executions`, and a deliberately doomed follow against an expired plan recorded as `failed` (`PlanExpired`) with no receipt.
- **Notes for later phases:**
  - On a fork the server needs `JUPITER_DEXES`; without it Jupiter can pick a private AMM (GoonFi) that fails the simulation, and the quote correctly answers `swap_would_fail` with nothing to sign.
  - The server refuses to hand out a transaction that fails simulation, that is above or below the plan's range at the quoted route, or whose route contains anything beyond the expected shape.
  - The "off-market fill" flag from section S is still to do (Phase 8 / analytics); `executions` already stores the effective price it needs.
  - Fees in the summary are estimates (network fee, priority fee, receipt rent). Token-account rent for a first-time buyer is not included yet.

#### Phase 6: Frontend foundation and feed (≈ 10 h, depends on Phase 4): DONE

- **Goal:** the visual identity and a browsable feed.
- **Tasks:**
  - [x] impeccable `shape` with `PRODUCT.md` (Solana-theatre identity, section G).
  - [x] `tokens.css` and fonts.
  - [x] Providers: React Query. The wallet provider and localnet burner moved to Phase 7 (see the Result).
  - [x] Tab bar.
  - [x] Vertical scroll-snap feed.
  - [x] `PlanCard` Layer 1: `StatusBlock`, `RangeBar`, evidence line, action row.
  - [x] Local watch list.
  - [x] The curtain intro and marquee logo.
- **Files:** `app/src/routes/{__root,index}.tsx`, `app/src/components/feed/**`, `app/src/styles/**`, `app/src/lib/{wallet,watchlist,api}.ts`.
- **Done when:** in Chrome at 390×844, the feed snaps card by card, statuses read correctly with their icons and words, watch works with no wallet, and reduced motion disables the animations.
- **Result:** The feed is server-rendered from `GET /feed` (TanStack Start `createServerFn`), then React Query takes over with cursor paging and a 15 s refetch. New plans wait behind a "New plans" pill instead of reshuffling the card being read. Each card shows the exact status vocabulary (`in_range` "In plan range", with "· closes in N min" when closing soon; "Original entry passed"; "Below plan range"; "Plan expired"; "Closed by creator"; "Price may be outdated" after 60 s; "Price unavailable"). Status is computed live from `@relay/domain` `entryStatus`/`pricePosition`; money stays in bigint units. Each status has its own icon, words and ink, and the range bar puts a price marker on the plan band. Every state is truthful: SSR first page, loading more, empty, service unavailable (with dev setup steps), stale data, and Solana unreachable. The end-of-feed card closes the curtain with a status tally. Watching needs no wallet: `localStorage` via `useSyncExternalStore`, listed on `/me` ("Saved in this browser only"). Keyboard: j/k or arrows move, w watches, and `?plan=` deep-links and restores the card. 23 app tests (`bun test` in `app/`) cover the vocabulary, format, range bar, watch-list parsing, the API contract parser, live status, feed ordering and fixture labelling. Lint, `tsc -b` and the build are clean. Verified in Chrome at 390×844 and 1280×800: no card overflow, keyboard access, reduced motion (curtain off, bulbs static, no transitions), watch persists across reload, and rotation keeps the current card. The Impeccable finish review ran two rounds; the remaining drape finding was closed by the owner's amendment (flat velvet, no imagery). The design system is recorded in `DESIGN.md`.
- **Deviations:**
  - **Wallet deferred to Phase 7.** It will use Kit / Wallet Standard via `@solana/react` plus the localnet burner, instead of wallet-adapter. Phase 6 needs no wallet: Review trade shows its disabled reason ("Trade review isn't available in this build yet").
  - **Styling:** global CSS (`app/src/styles/{tokens,base,theatre,feed}.css`) instead of CSS modules. `App.css`/`index.css` were removed.
  - **No follower evidence yet.** `GET /feed` carries no follower results, so the evidence line states onchain commitment facts and says follower results are not in this view. Nothing is invented.
  - **Placeholder tabs.** Search and Account are placeholder routes; My Plans (`/me`) lists the local watch list.
  - **Fictional preview.** `?preview=fictional` (dev builds only) shows a fixture feed. Every card is badged FICTIONAL with `fictional-*` IDs and no hashes or signatures. By default an unreachable API shows the truthful "service unavailable" state.
  - **Theatre frame:** the earlier flat-velvet amendment is superseded by the theatre redesign below. The owner pinned the curtain-sol reference as the visual authority.
  - **Build config:** the app `tsconfig` lib is `ES2024` (`String.prototype.isWellFormed`). Impeccable artifacts live in `PRODUCT.md`, `DESIGN.md`, `.impeccable/` and `app/.impeccable/`.
- **Local setup (macOS):**
  - `server/.env`: `APP_ORIGIN=http://localhost:5175`, `SOLANA_CLUSTER=localnet`, `SOLANA_RPC_URL=http://127.0.0.1:8899`, `JUPITER_DEXES`.
  - `app/.env.local`: `VITE_RPC_URL=http://127.0.0.1:8899`, `VITE_SOLANA_CLUSTER=localnet`.
  - The feed needs the API (`bun run dev:server`, port 3001) with a reachable `DATABASE_URL`: the hosted Neon database in `server/.env`, or a local Postgres (`docker compose -f compose.dev.yaml up -d`, or Homebrew `postgresql@17`). It also needs Surfpool on :8899 for live chain status, and a signed seed (`bun run --cwd server seed`) for new plans.
  - Server tests use `postgres://relay:relay_local_only@127.0.0.1:5432/relay_test`. Create that database once (for example `createdb -h 127.0.0.1 -U relay relay_test`).
- **Theatre redesign (2026-10-10):** The feed was rebuilt on the owner's curtain-sol prototype as the authoritative visual reference. Its `app/theatre.css` and theatre components were studied, and the prototype was run locally for side-by-side screenshots. Presentation was ported only: no Next.js app, backend, wallet setup or older SDKs. All data is still the real onchain feed.
  - **Ported from the reference:**
    - Palette: velvet `#1b1035`/`#0f0820`, curtain burgundy, brass, limelight, chalk and haze.
    - Type: the Apple text scale, Big Shoulders Display 800, and the system text stack (Schibsted Grotesk was removed).
    - Spacing and radii.
    - Drapes: burgundy repeating folds with a brass hem and bead fringe, gathered to the wings (`scaleX(.14) skewY(±2°)`) under a scalloped valance.
    - The brass marquee sign with chasing bulbs, the limelight conic spotlight, and the perspective stage floor.
    - Arched brass portraits with a name plate, and round avatars.
    - The sigil generator; two of its inks are now Solana green and purple.
    - Atoms: limelight primary, glass ghost, 44px star button, and brass badge.
    - The act composition: portrait, byline, pair, quote, then status and actions in the thumb zone.
    - The script sheet as Layer 2.
    - The "Fin." closing scene: drapes close, curtain call, tally.
    - Motion via `motion/react` with the reference's ease `[0.16,1,0.3,1]`: the spotlight swings in from the scroll direction (±14°, 0.9 s), the portrait rises into the light on activation, the finale drapes close (1.1 s), and the curtain call bounces.
  - **Adapted:**
    - The opening keeps the reference's closed curtain and lit sign. It runs as CSS keyed by the head boot script, so it starts before hydration, stays ≤1.2 s, plays once per session and only when the feed is the landing page, and any key, tap, wheel or touch skips it.
    - Native vertical scroll-snap replaces the 12 s auto-advance, tap zones and horizontal navigation.
    - A flat status plaque (pill shape plus icon plus words, hint, range bar, "Now $X · updated") replaces the reference's gauge, so plan terms are never on a gradient.
    - No portraits of people: every creator is their sigil in the arch. Seeded demo creators carry a "Demo creator" badge, and the "(demo)" suffix moves from the plate to that badge.
    - Desktop (≥900 px) is a two-column stage standing on the floor horizon.
    - The ticker, burst, lobby gate, cast profiles, record dots and portrait float were not ported.
  - **New in this pass:**
    - "View plan" opens the script sheet, a native modal `<dialog>`. It shows the plan text, the reference price at publish, the onchain record, and the real version history from `GET /plans/:pda` (oldest-first parser, with "entry range changed / window extended / text changed" between versions).
    - The `d` key opens it.
    - The finale lists watched plans as jump-back chips, with Replay, Search plans, My Plans and Refresh.
    - A route-level loading state ("Setting the stage").
    - Hydration-safe reduced motion (`useCalmMotion`).
  - **`/api/feed` 502 root cause:**
    - Nothing was listening on :3001: the Vite proxy forwards `/api` to `127.0.0.1:3001`, and the API server wasn't running.
    - Postgres was not the cause; `server/.env` points at a hosted Neon database. Starting `bun run dev:server` restored a real HTTP 200 with eight onchain plans.
    - Stopping the API again shows the truthful "Relay's service is unavailable" state with "answered 502".
  - **Verification:**
    - App: 26 tests, lint, `tsc -b` and build pass. Server: 65 tests pass against a local `relay_test`.
    - Chrome at 390×844, 1440×900 and 1280×720: opening frames at 0.12, 0.45 and 0.8 s; the real populated feed (all eight plans currently expired, so in-range is shown via the labelled dev preview); the script sheet; the closing scene; loading, empty (stub API) and server-error (API stopped).
    - No act overflows at 390×844, even with a warning banner.
    - Keyboard (Tab focus ring in limelight, `j`/`k`, `w`, `d`); reduced motion (no curtain, no spotlight swing, no bulb chase, no hydration mismatch).
    - The Impeccable detector reports no anti-patterns.
    - The finish review returned "fix" (desktop portrait shrink under a banner, mid-word name breaks, floor horizon crossing text, sigil size), then "pass" after one fix batch.
    - `DESIGN.md` and `.impeccable/design.json` were rewritten from the shipped build.

#### Phase 7: Frontend flows (≈ 12 h, depends on Phases 5 and 6)

- **Goal:** the complete user journey in the UI.
- **Tasks:**
  - [x] Details sheet (Layer 2) with the version timeline: shipped early as the theatre script sheet (Phase 6 redesign).
  - [ ] Publish composer (v1; v2 in the UI if time allows, otherwise by script).
  - [ ] Review sheet with `follow-machine.ts` and the client-side rebuild-and-check.
  - [ ] My Plans (Followed). Partly done: a read-only lookup of any wallet's verified receipts and failed attempts from `GET /me/executions`. Linking it to a connected wallet waits for the wallet work.
  - [ ] Plan page `/p/$planPda` (Layer 3).
  - [x] Error and empty states (section E) for the feed, plan sheet and My Plans: loading, empty, expired, stale price, Solana unreachable, service unavailable (with retry and a separate demo), per-row plan errors.
- **Files:** `app/src/components/{sheets,plan}/**`, `app/src/routes/{publish,me,p.$planPda}.tsx`, `app/src/lib/follow-machine.ts`.
- **Done when:** with the burner wallet you can publish, follow → Recorded, and see the receipt in My Plans and on the plan page.
- **Mascot-led experience (2026-10-10, owner request), in progress toward this phase:**
  - **Cue artwork.** The seven poses (welcome, discover, saved, missed, unavailable, bow, mascot) are the owner's Figma vectors (file `ZwWGrYQ2vMcS0ochnyAEKR`, nodes 605-16452 … 605-16868), exported individually as SVG into `app/assets/cue/`. `app/scripts/cue-art.ts` turns them into data (`app/src/components/cue/cue-art.ts`) rendered by `Cue.tsx` with `createElement`, not `innerHTML`. Character-sheet backdrops and Figma's bounds stubs are stripped and clip ids are made unique per instance. Nothing is redrawn: proportions, colours and expressions are the source paths. The pupils and glints are tagged so they can move.
  - **Welcome and opening.** The closed curtains, Cue's welcome pose and the brass sign stay up until "Explore the plans". On click Cue switches to the discover pose with a hop (0.36 s), the drapes gather to the wings (0.3 s delay, 0.9 s, ease `[0.33,1,0.68,1]`) and hand over to the global drapes, then focus moves to the first plan. Reduced motion: an instant pose change and a 0.2 s fade. `localStorage relay:entered` marks a returning visitor, who gets the short session opening instead.
  - **Pointer.** Fine pointers only, never touch or reduced motion: `useStagePointer` springs (one write per frame, no React state) drive a slight limelight shift, a ±3° lean, ±7 px drape parallax and pupils bounded to 5 × 3.5 SVG units. Buttons and the cursor never move or change.
  - **Cue in the flow:** discover pose on the empty feed and Search; the bookmark pose in the watch toast ("Saved to My Plans. Watching … doesn't place a trade.", top of the stage so plan controls stay clear, auto-dismisses after 5 s, and the same text goes to the live region); the "Missed this entry" pose in the plan sheet and My Plans when the original entry has passed; the cable pose on service unavailable and Not Found; and the bow in the closing scene (drapes close, Cue bows, "That's tonight's lineup.", then Review watched plans / Explore again / Search / Refresh).
  - **Plan sheet.** It gains "Following this plan": choose an amount, get a fresh quote checked against the range and window, connect a wallet, approve yourself. It says honestly that review isn't in this build, or that an ended plan can't be followed.
  - **My Plans.** Watching now stores a snapshot (status, version, price, range, expiry) taken when the plan was watched. Each row fetches `GET /plans/:pda` and shows the live status, the check time, and what changed since watching (status, version, price); per-row errors offer a retry. Older entries without a snapshot say so. **Followed:** a public wallet lookup (base58 check, remembered locally) lists verified receipts (spent, received, entry price, receipt, slot, transaction), failed attempts kept as failures, an _estimated_ open result (base received × current reference price − spent, bigint, labelled as an estimate without exit fees), and "Verified closed outcomes: none yet". Block times outside 2020–2100 are hidden because the local fork reports `blockTime` 1791571 for slots near plan time 1791570936.
  - **Demo (`/demo`).** One fictional walkthrough: Mika, "fictional demo profile", SOL/USDC, entry $140–$145. Price $143 ("In plan range"), Watch (Cue: saved), then the explicit "Advance demo · 20 minutes" sets the price to $148 ("Original entry passed"). Cue holds the ticket and says "The price moved above Mika's original range. Watching saved the plan; it did not place a trade." Original and now are shown side by side; a second advance passes the window and Cue bows. A sticky "Fictional demo · simulated prices · no real trades" banner stays on screen. Statuses come from the same `entryStatus`. The demo has no API calls and no storage, uses a component-local watch, and has no receipts and no results (tested).
  - **502 diagnosis (again).** `/api/feed` 502 means the Vite proxy found nothing on :3001. The dev "Development setup" note now says so. With the API running, `localhost:5175/api/feed` and `:3001/feed` both return 200 with eight real plans.
  - **Verification:**
    - App: 39 tests (13 new: art integrity, demo scenario and isolation, snapshots, changes, estimate math, block-time guard, address check, execution parser), lint, `tsc -b` (now including `app/scripts`) and build pass.
    - Chrome at 390×844 and 1440×900/960×700: welcome, opening mid-frame, populated feed, watch toast, plan sheet (real, plus the labelled preview for "Original entry passed"), closing scene, demo before/after, My Plans with a real price change since watching and the real follower `966bBK…` receipt and failed attempt, and service unavailable (a second Vite pointed at a dead API port).
    - Keyboard: Tab reaches Skip, Explore, Try a demo; Enter opens; focus lands on the first plan; `j` and `w` work; the watch persists to `/me`; a return visit skips the welcome.
    - Reduced motion: the reveal takes 250 ms and nothing leans.
    - Screenshots are in `.impeccable/review/cue/`.
  - **Not done, stated plainly:**
    - No wallet connection, quote, review or signing in the app, so Follow can't be completed from the UI.
    - Surfpool is not running, so every real plan is expired and the feed shows "Can't reach Solana right now".
    - "Original entry passed" with real data has not been seen live; it is shown with the labelled fictional preview and the demo.
    - No plan page `/p/$planPda`.
    - Verified closed outcomes don't exist yet (no exit flow).
- **Result (2026-10-10, discovery direction):** the frontend follows the owner's clarified direction (section D): traders' public ideas and verifiable activity, with four labelled kinds of content. Backend unchanged.
  - **Welcome.** An introduction, not the feed. Headline "Meet the traders. Follow the evidence.", the lede "Discover Solana traders, explore their public ideas, and see the activity we can verify.", "Explore traders" and "Try the demo". The RELAY sign is now the brand (smaller, quieter glow) and the h1 is the headline. No tab bar on the welcome. Desktop gets a compact header (Explore, which opens the curtains through a `relay:enter` event; How it works; Watchlist); phones get the bare valance. The scene covers the tab-bar row and scrolls instead of cropping; below 700 px high Cue and the sign shrink.
  - **Shell.** Discover `/`, Traders `/traders`, Watchlist `/watchlist`, Account `/account`. Phones use the bottom tab bar inside the app only; desktop hides it and the valance becomes the header (the same links plus How it works). A `--tabbar-space` variable sizes the grid row, drapes and floor, so nothing sits under the bar. `/me` → `/watchlist` and `/search` → `/traders` redirect. A Back control uses history, or a named fallback on a direct visit.
  - **Traders and profiles.** `/traders` says plainly that the 10 selected traders aren't connected yet, and lists none of them. Below that, "Publishing through Relay" groups the feed's plans by signing wallet (`lib/traders.ts`, up to 10 feed pages), with demo creators badged and bare wallets marked "Wallet only". `/traders/$address` shows identity with its basis (the wallet is "linked by signature" because it signed the plans; name only from the Relay profile; public sources "None connected"; no explorer link on the local fork), the plans as records, and a "Not connected yet" list for public posts and other on-chain activity.
  - **Records.** `/records/$planPda` is the Layer 3 page: kind and demo badges, "Follow the plan. See the proof.", what was posted (terms and text, or "Unavailable" with the reason), when (chain time), status now on the real plaque, evidence (program, full plan and version accounts, terms and text hashes, and "Followers: not shown per plan yet"), version history, and following. The plan sheet links to it and to the profile.
  - **Kinds.** Public post (dashed), On-chain activity (solid), Published through Relay (brass), Fictional demo (dotted ember) appear on feed acts, records, the demo and How it works (`/how-it-works`, which also lists what is connected today).
  - **Watchlist.** Traders can be watched without a wallet (`relay:watched-traders`, newest plan remembered), and the Watchlist shows "N new plans since you watched". Watched records open their record page. Cue's bookmark pose confirms watching on the feed, the profile and the record page.
  - **Demo.** `/demo` adds Mika's two fictional records, a public post and a Relay plan, each labelled, with "An idea, not proof of a trade."
  - **Pointer.** In the app, the resting drapes drift up to 4 px and the feed spotlight up to 18 px with the pointer. It uses the same fine-pointer, reduced-motion-off springs, and everything returns to rest when the pointer leaves.
  - **Code and plan differ:** section M names `c.$address.tsx` and `p.$planPda.tsx`; the routes are `traders.$address.tsx` and `records.$planPda.tsx` to match the new navigation. `GET /creators/:address` and `GET /search?q=` (section L) still don't exist; profiles are derived from `/feed` on the client until they do.
  - **Verification:** 48 app tests (9 new: trader grouping and order, address-only names, trader-watch parsing, explorer links, kind wording, watch snapshots), lint, `tsc -b` and build pass. A CDP script ran 39 behaviour checks, all passing: welcome and no tab bar, Tab to Explore and Enter, the header's Explore, every tab and header link with its current state, content ending above the tab bar, watch toast, a watched trader persisting after reload, Back, both redirects, kind labels, short-phone fit, pupils bounded and reset on leave, controls not moving, reduced motion with no gaze, and no runtime errors. Screenshots at 390×844, 390×640 and 1440×900 are in `.impeccable/review/cue/v2/`.
  - **Still planned, not connected:** selected traders and their sources; public-post ingestion; on-chain activity beyond Relay plans; linked-wallet proofs (Phase 16); per-plan follower receipts; wallet connection, quote, review and signing in the UI; Surfpool is down locally, so every real plan reads expired and the feed shows "Can't reach Solana right now".
- **Result (2026-10-10, frontend redesign and wallet flow):** the whole frontend was redesigned as one theatre system, and the app can now connect a wallet and follow a plan. Backend unchanged.
  - **Foundation.** The type scale follows the Figma design system's proportions (`--h-hero`, `--h-page`, `--h-section`, `--h-card`); controls come in 48/44/40 px (`--ctl`, `--ctl-sm`, `--ctl-xs`); shared field, tablist, switch, panel, disclosure, spinner and pair-icon styles live in `base.css` and the new `screens.css`. `DESIGN.md` records it.
  - **Shell.** The welcome is closed curtains, the sign, Cue and one line ("Discover Solana traders. Explore their ideas. Check the evidence.") with Explore traders and Try the demo; no navigation or wallet, and it never replays on a route change (Account has "Meet Cue again"). The desktop header has Discover, Traders, Watchlist and How it works with `aria-current`, then the network chip, the Cue cursor switch, an Account link and the wallet control. Phones keep the four-tab bar.
  - **Wallet.** `lib/wallet.ts` discovers wallets through Wallet Standard events (no wallet SDK). The dialog walks choose → connecting → connected, cancelled, failed or missing. Connecting calls `standard:connect` only: no signature. The connection survives navigation; the header and Account show it and can disconnect.
  - **Trade panel.** `components/trade/TradePanel.tsx` sits beside the record on `/records/$planPda` (sticky on desktop; after the status on phones). It shows the network before anything is signed, checks the amount (`checkFollowAmount`), gets a fresh quote, rebuilds and checks the transaction in the client (`composeFromQuote`), asks the wallet for `solana:signTransaction`, sends it itself, then verifies the receipt (`verifyWithRetry`). Failures stay failures. Out of range, expired and fictional previews are disabled with the reason. Feed acts and the plan sheet send "Review trade" to the record's `#follow`.
  - **Cue cursor.** `CueCursor.tsx` and `lib/cue-cursor.ts`: desktop fine pointers only, inside `data-cursor-zone` areas, never over text, controls, forms or dialogs; `pointer-events: none`; off for touch, coarse pointers and reduced motion; a header switch and an Account preference turn it off and persist it.
  - **Screens.** How it works is three interactive scenes (Discover, Watch, Check the evidence) with a step indicator, Back/Next/Skip, arrow keys, focus on each new title and fictional examples. Watchlist has Traders / Records / History tabs (URL state, arrow keys), "Stored in this browser only", and Cue's bookmark empty state. Traders is a card grid under the honest "not connected yet" callout; profiles are two columns; Account has Wallet, Preferences, Network and Cue.
  - **Code and plan differ:** this phase planned a localnet burner wallet, `follow-machine.ts`, a review sheet and `/p/$planPda`. What shipped is a real-wallet sign-only flow through Wallet Standard (no burner), the follow state machine inside `TradePanel`, and the review inside the panel on `/records/$planPda`. Publishing from the UI is still not built.
  - **Verification:** 60 app tests (12 new in `test/wallet-trade.test.ts`: wallet entry and account parsing, user-rejection detection, amount checks, quote parsing, cursor preference). `tsc -b`, app and root lint, build and Prettier pass. A CDP script ran 49 behaviour checks, all passing: the welcome line and no navigation, no replay, header links and current state, the wallet control, the cursor switch, Watchlist tab keys, trader-card links, How it works Next/focus/arrow keys, and the expired-plan button. A test Wallet Standard wallet injected into Chrome confirmed connect calls only `connect` (no signing), and that cancel ("Connection cancelled… Nothing was shared.") and failure ("Wallet is locked.") read correctly; the missing-wallet state was checked without it. The Cue cursor hides the native cursor only on empty stage and returns it over headings and buttons; the switch removes it; reduced motion and touch keep the native cursor. Screenshots at 1440×900, 390×844 and 390×640 are in `.impeccable/review/cue/v2/`.
  - **Not done, stated plainly:** no quote, signature, send or verified receipt has been exercised end to end from the UI, because Surfpool is down and all eight real plans are expired (the button reads "Plan expired — entry window closed"). No real wallet extension was tested, only the injected test wallet. Selected traders, public posts and per-plan followers are still not connected.

#### Phase 8: Demo slice (≈ 8 h, depends on Phase 7)

- **Goal:** make the core insight visible in about 4 minutes (section X).
- **Tasks:**
  - [ ] Comparison panel.
  - [ ] Entry strip.
  - [ ] Blocked-attempts list, kept separate from "Prevented before signing".
  - [ ] Expiry via time travel or a 3-minute window.
  - [ ] The "Verify yourself" block.
  - [ ] Demo labels everywhere.
  - [ ] Seed for the illustrative scenario.
- **Done when:** the demo script runs end-to-end twice in a row on a fresh fork.

#### Phase 9: Hardening and rehearsal (≈ 8 h, depends on Phase 8)

- **Tasks:**
  - [ ] impeccable `critique` / `clarify` pass.
  - [ ] web-design-guidelines review.
  - [ ] One Playwright smoke test (feed → review → recorded).
  - [ ] Docs: server required, Surfpool how-to, "never sign fork transactions with mainnet keys".
  - [ ] Demo script.
- **Done when:** the smoke test is green, the demo runs in under 4 minutes, and known gaps are listed honestly.

**Demo device reality:**

- A phone can't reach `127.0.0.1:8899`, and mobile browsers have no wallet extensions. So the demo runs **in desktop Chrome with a 390×844 viewport and the labelled local burner wallet**.
- Optionally, proxying RPC through `/api/rpc` lets a phone on the LAN load the UI.
- Real wallets (Phantom/Backpack) are a stretch goal: they simulate against their own mainnet RPC, so on the fork they will show "may fail" warnings.

**Deferred from Stage 1** (each item already has a Stage 2 phase):

- SIWS and profile editing → Phase 10
- the polling indexer and checkpoints → Phase 11
- card windowing, the desktop side panel, keyboard shortcuts and the full E2E suite → Phase 12
- search → Phase 15
- a creator profile beyond a header with a plan list → Phase 14

**Cut lines if still behind**, in order:

1. `close_plan`;
2. the revise UI (keep v2 via a script, because the append-only _display_ must stay);
3. the entry strip;
4. light theme.

**Never cut:**

- the onchain receipt checks;
- the status vocabulary;
- the fictional labels.

### Stage 2: post-demo MVP (each phase ends in something demonstrable)

| Phase | Goal                                    | Key work                                                                                                 | Done when                                                       |
| ----- | --------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 10    | Wallet sign-in + profiles               | SIWS (section N), sessions, `PUT /creators/me`, rate limits                                              | Hono auth tests pass (replay, domain, cross-account)            |
| 11    | Durable indexing                        | polling indexer with checkpoints (R), finalized-only analytics, backfill, a separate service, lag alerts | a kill/restart mid-sync produces no duplicates or gaps (tested) |
| 12    | Feed polish                             | card windowing, desktop side panel, keyboard shortcuts, full E2E suite, light theme                      | Playwright suite green on mobile and desktop viewports          |
| 13    | Exits via Relay                         | a `begin_exit`/`finish_exit` mirror pair linked to a receipt; realized PnL; partial exits                | realized numbers appear only for exit receipts; FIFO tests pass |
| 14    | Creator profiles + metrics              | derived `plan_metrics`/`creator_metrics`; coverage block                                                 | every number shows n, method and timestamp                      |
| 15    | Watchlist sync + search + notifications | `watches` table merged on login; `/search`; Web Push on status changes                                   | watching still works logged-out                                 |
| 16    | Multiple linked wallets                 | `wallet_links` with a per-wallet SIWS proof; coverage copy                                               | the profile states exactly which wallets are observed           |
| 17    | Devnet → mainnet readiness              | Kit + Codama migration ADR; v1 transactions; upgrade-authority multisig; external review; RPC provider   | security review signed off; no mainnet path without it          |
| 18    | Onboarding                              | evaluate Privy or an alternative: Solana embedded wallets, custody model, export, pricing, regions       | a decision record; a prototype behind a flag                    |
| Later | Fiat onramp                             | a provider per region, with KYC                                                                          | legal review first                                              |

---

## X. Demo slice

**Story (about 4 min), on the Surfpool fork:**

1. **Open Relay (no wallet).** The feed shows fictional demo creators, labelled. One card is the **live** plan, published 2 minutes ago by "Demo Creator" for SOL/USDC, entry range around the current price ±0.5%, window 5 min. Status: **In plan range**.
2. **Follower A** (burner wallet A, local test USDC) taps Review trade.
   - The review shows real Jupiter route labels, a minimum output and "Your price $X ✓ inside plan".
   - A approves, and the state shows Recorded ✓.
   - My Plans shows the receipt, and the plan page links the receipt PDA and the transaction.
3. **The creator revises** the plan to v2 (tighter exit). The card shows "↻ updated". The details sheet shows v1 unchanged next to v2, with their hashes.
4. **Follower B arrives late.** Time-travel the fork past expiry, or use a range where B's amount breaches the high bound. The card shows **Plan expired** / **Original entry passed**, and Review is unavailable with the reason.
5. **The bypass.** Run the CLI script that calls the program directly with B's keypair and **`skipPreflight: true`**. Without that flag, the RPC rejects the transaction during simulation, it never lands, and nothing can be shown.
   - The transaction **lands and fails onchain** (`PlanExpired` / `PriceAboveRange`).
   - It appears in the plan's "Blocked attempts", labelled as failed. No receipt exists.
   - Attempts the _app_ stopped before signing are counted separately as "Prevented before signing". They are never mixed with onchain failures.
6. **The insight panel (comparison).**
   - **Live:** A's actual entry vs the plan reference vs the creator's observed entry, if the creator also followed.
   - **Illustrative scenario (clearly labelled FICTIONAL):** "Creator reported +20%. Median follower +17% (n=9 wallets). 4 attempts blocked after the original entry passed." This shows the long-run view that can't be produced live in minutes.

**Must work live** (with Fallback B, the swap is labelled simulated, and everything else is still real):

- the plan commit and the version PDAs;
- hash-checked plan text;
- Jupiter `/build` routing;
- the swap on the fork;
- the receipt PDA;
- the onchain rejection of late or bypassed attempts;
- `/follow/verify`;
- My Plans.

**May use labelled fictional data:** other feed creators, historical outcomes and price paths, the illustrative comparison numbers.

**Never:** fake signatures, fake receipts, or fictional numbers without a badge.

---

## Y. Validation plan

- **Interviews (before or during the pilot):** 8 creators and 15 followers. Questions:
  - How do you decide whether a call is still valid?
  - What would make you publish losing plans publicly?
  - Would you pay for follower-outcome data?
- **Pilot:** about 10 creators and 50–100 prospective users, over 2–3 weeks. _This is a hypothesis, not a promise._
- **Comprehension tests:** the 5-second card test (E), the Review comprehension test ("What happens if the price moves?") and the comparison-panel test ("Did followers do as well as the creator?").

**Metrics and pre-set thresholds:**

| Metric                                                      | Threshold                                    | Failure signal                           |
| ----------------------------------------------------------- | -------------------------------------------- | ---------------------------------------- |
| Status comprehension                                        | ≥ 80%                                        | < 60% → rework the vocabulary            |
| "Not a recommendation" understood                           | ≥ 80%                                        | < 60% → stop and redesign                |
| Week-2 return of browsing users                             | ≥ 25%                                        | < 10%                                    |
| Creators publish ≥ 3 plans and keep the losing ones visible | ≥ 6/10                                       | ≤ 3/10 → the creator incentive is broken |
| Receipt attribution match against manual audit              | 100% for recorded, ≥ 95% of attempts indexed | any mismatch blocks the pilot            |
| Users who open follower evidence before reviewing           | ≥ 40%                                        | < 15% → evidence isn't the draw          |
| Willingness to pay (stated plus fake-door)                  | ≥ 10% click "Pro analytics"                  | < 3%                                     |

**Pivot criteria:**

- **If users mostly want faster buying:** do not add one-tap buying. Reconsider the product as a creator-accountability tool.
- **If creators refuse permanence:** test private or "draft" plans with delayed publication.

**Business (assumptions, labelled):**

- Possible revenue: paid analytics or discovery (deeper history, comparisons, filters).
- No hidden spread, no fees on swaps in the MVP, no revenue from users' losses.
- Referral or platform fees only with explicit disclosure, after legal review.

**Competitive context:** FOMO, AfterHour, dub, TipRanks, Outlight, Phoenix Research, Bitget, DeStreet, Trenches.top and CredCall all overlap. Relay claims no invention. The hypothesis is the _integrated lifecycle with verifiable follower receipts_. (Optional: `colosseum-copilot` for precedent research, if authenticated.)

**Legal and platform flags.** These need professional review later; they are not engineering blockers for a local demo:

- copy-trading or financial-service classification (ESMA Q&A cited in the prototype);
- transaction facilitation;
- creator incentives and market manipulation;
- token promotion rules;
- disclosures;
- fiat or KYC;
- App Store crypto rules;
- jurisdiction.

---

## Z. Open questions

**Must decide before implementation:**

1. Plan window maximum: 7 days (proposed) or 30 days (prototype)?
2. Are revisions after expiry allowed ("reopen")? Proposed: yes, flagged in the UI.
3. Are lower bounds enforced at execution? Proposed: yes (see D.1).
4. Demo amounts cap, for example ≤ 1,000 test USDC.
5. Spike outcome: GO (Jupiter on the fork with the burner wallet), A′ (restricted dexes) or B (mock venue)?
6. Off-market-fill threshold: 150 bps proposed.

**Can decide during implementation:**

- exact fonts and palette (impeccable);
- `maxAccounts` value;
- price-poll interval;
- the "closing soon" threshold;
- the handle rules;
- whether `close_plan` ships in the demo.

**Can wait until after MVP:**

- Kit + Codama migration (ADR);
- v1 transactions;
- `emit_cpi!` events;
- Yellowstone streaming;
- multi-wallet linking;
- Privy or other onboarding;
- fiat;
- business model;
- program upgrade governance;
- native app.

---

## Glossary (plain English)

- **PDA:** a program-owned "row" at a deterministic address with no private key (see K).
- **CPI:** one program calling another inside a transaction. Relay _avoids_ calling Jupiter this way.
- **ATA:** your standard token "balance account" for one token, at an address derived from wallet + mint.
- **Token account:** the account holding a balance of one token for one owner.
- **Oracle:** an onchain price feed. Relay doesn't need one, because it measures real fills.
- **Slippage:** the gap between the quoted and the actual fill. The minimum output caps it.
- **Commitment (hash):** a fingerprint of the plan published onchain, so any later change is detectable.
- **Commitment (RPC level):** how settled a block is: processed, confirmed or finalized.
- **Slot:** Solana's clock tick, about 400 ms, used as an ordering timestamp.
- **Versioned (v0) transaction:** a format that can reference address lookup tables, so big swaps fit in 1232 bytes.
- **Priority fee:** an optional tip per compute unit that helps under congestion.
- **Transaction simulation:** a dry run on an RPC node that reports errors and compute use without broadcasting.
- **SIWS:** Sign-In With Solana, a structured login message. It is never a transaction.

---

## Recommended First Implementation Task

**Slice 1: "A receipt can only exist if an in-range swap really happened."** An onchain plan commitment plus a verified follow receipt, proven by LiteSVM tests and a Surfpool CLI script. There is no UI yet.

This slice is **Phases 0–3** of section W. Each phase is done and checked before the next one starts.

**What gets built.** This is one slice, delivered in three steps. Each step must pass before the next starts.

1. **Step 1: the spike (≤ 3 h, go/no-go).** Done on a Surfpool fork, with the outcome recorded in `docs/spikes/surfpool-jupiter.md`:
   - fund a burner with USDC;
   - land an unmodified `/build` swap;
   - dump the Jupiter program ID and the setup, cleanup, other and tip instructions;
   - measure the offline message size using the real begin/finish account lists;
   - choose GO, A′ or B.
2. **Step 2: program and domain.**
   - **The `domain/` workspace:** `amounts.ts` (ported), `price.ts` (u64 price units, effective price), `commitment.ts` (binary content and terms hashes with reject-not-transform validation), `entry-status.ts`, `tx.ts` (`composeFollowTx`), and `test-vectors/plan-hash.json`.
   - **The `program/programs/relay` crate** (renamed from `course_program`): Plan, PlanVersion and FollowReceipt; `create_plan`, `revise_plan`, `begin_follow` and `finish_follow`, with the top-level and exactly-one-swap rules; errors and events.
   - **Test-only crates:** `program/programs/mock_swap` and `program/programs/cpi_attacker`.
   - **The LiteSVM adversarial suite** (the Rust rows in section U).
3. **Step 3: `scripts/follow-demo.ts`.** On the fork, it:
   - creates a plan;
   - calls `/build`;
   - runs `composeFollowTx`;
   - signs with the burner and sends;
   - prints the receipt;
   - time-travels past expiry and sends a late follow with `skipPreflight: true`, then prints the onchain `PlanExpired` failure.

**Why first:**

- It is the riskiest and most differentiating claim: real receipts, unbypassable checks, real Jupiter routes in one transaction.
- Every other milestone (feed status, review, My Plans, comparison) consumes its accounts, hash and units.
- If it fails, the fallback must be chosen on day 1, not day 3.

**What it proves:**

- The `terms_hash` from TS and Rust is identical.
- A version cannot be rewritten.
- A follow outside the range or after expiry reverts atomically.
- A fake receipt is impossible. The tests cover: no swap, a token shuffle, double pairs, a second wallet swapping into the follower's ATA, and a CPI wrapper.
- The transaction fits within the size and CU limits on a real route.

**Files affected:**

- **Program:** `program/Anchor.toml`, `program/programs/relay/**` (renamed), `program/programs/mock_swap/**`, `program/programs/cpi_attacker/**`.
- **Docs:** `docs/spikes/surfpool-jupiter.md` (new).
- **Domain:** `domain/**` (new), root `package.json` (workspaces).
- **Scripts:** `scripts/sync-idl.ts` (new name; also copies to `server/src/idl`), `scripts/follow-demo.ts` (new).
- **App wiring for the rename:** `app/src/lib/program.ts` and `app/src/idl/*` (updated so the app still builds).

**Done when:**

- `bun run program:test` passes, with every listed adversarial case.
- `bun test` in `domain/` passes, including the shared vector.
- On a fresh Surfpool fork, `bun run scripts/follow-demo.ts` prints a Recorded receipt with real Jupiter route labels. Under Fallback B, it shows the "Simulated swap venue" label instead. It then shows the landed `PlanExpired` failure for the late attempt.
- `bun run build:app` still succeeds after the rename.
