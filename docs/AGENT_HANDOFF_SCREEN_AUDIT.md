# Agent handoff: screen audit, consistency gaps, host the app

Prepared **2026-10-12** after a full Playwright capture of every user-facing screen and a cross-check against [PRODUCT.md](../PRODUCT.md), [ROADMAP.md](ROADMAP.md), the server API, and the Anchor program.

**Authority when documents disagree:** PRODUCT.md > ROADMAP.md > subsystem READMEs > this handoff. This file is an **operational brief for the next agent**, not a product rewrite. Historical plans under `docs/archive/` are not current authority.

**Companion artifacts**

| Artifact | Path |
| -------- | ---- |
| Screenshot PNGs (26) | [screenshots/audit-2026-10-12/](screenshots/audit-2026-10-12/) |
| Capture script | `app/scripts/capture-screens.ts` (`bun run --cwd app screens`) |
| Playwright CLI | `@playwright/cli` in `app/` (`bunx playwright-cli`) |
| Cursor canvas summary | workspace `canvases/screen-audit-gaps.canvas.tsx` |

---

## 1. What Relay is (do not blur this)

Relay is a **public-source trading-idea memory system**:

> See the original idea. Follow what changed. Check the evidence.

Two domains that **never share authority**:

1. **Discovery (primary).** Hand-reviewed public posts and automatic RSS/Atom detection. Wallet-free. Watch/Updates are **browser-local** (`relay:discovery-watch:v1`). No invented traders, PnL, or “verified” claims.
2. **Native plans (optional).** Solana **devnet** plans under Plans: creator signs terms onchain; follower authorizes every trade; server mirrors chain and never decides outcomes. Failed txs stay failed.

Stack (fixed): TanStack Start, Hono, Bun, Postgres, Anchor, `@solana/kit`. No `@solana/web3.js`, no Anchor TS client, no TypeScript `as` assertions, money as integers.

---

## 2. Repository structure (read in this order)

Before editing, read:

1. [PRODUCT.md](../PRODUCT.md)
2. [docs/ROADMAP.md](ROADMAP.md) (milestones M0–M8 are DONE; deferred work listed at bottom)
3. Subsystem README for the area you touch: `app/`, `server/`, `program/`, `server/curation/`
4. [DESIGN.md](../DESIGN.md) for UI
5. [AGENTS.md](../AGENTS.md) for always-on engineering rules

### Map

| Path | Role |
| ---- | ---- |
| `app/` | TanStack Start frontend. Features: `app/src/features/{discovery,onboarding,plans,account}`. Routes in `app/src/routes/`. Theatre CSS: `stream.css`, `interval.css`, `audience.css`, `theatre.css`, `showtime.css`. |
| `server/` | Hono API. Modules: `server/src/modules/{discovery,plans,auth}`, `shared/`. Curation: `server/curation/curated.json`, `feeds.json`. |
| `domain/` | `@relay/domain`: money math, hashes, entry status, Kit program client + IDL. |
| `program/` | Anchor program `relay` (`create_plan`, `revise_plan`, `close_plan`, `begin_follow`, `finish_follow`). Test helpers: `mock_swap`, `cpi_attacker`, `simulated_venue`. |
| `scripts/` | `anchor.ts` (WSL), `sync-idl.ts`. |
| `docs/` | Roadmap, runbooks, this handoff, screenshots. |
| `compose.dev.yaml` | Local Postgres. |
| `compose.yaml` + `Caddyfile` | Production one-host stack. |
| `DEPLOYMENT.md` | How to host on EC2 + Caddy. |

### Primary user journey (product)

Welcome → Discover → Trader profile → Idea timeline → Watch → Updates → Source / evidence.

Optional: Plans → plan detail → quote → wallet approve → receipt.

---

## 3. Screens captured (2026-10-12)

Stack at capture: app `http://localhost:5173`, API `http://localhost:3001`, curated data loaded, `GET /plans/feed` returned **0 items**, `GET /health/ready` ok (database + RPC).

Re-run:

```bash
# App + API already running with curated data
bun run --cwd app screens
# → docs/screenshots/audit-2026-10-12/*.png + index.json
```

| File | Screen | What we saw |
| ---- | ------ | ----------- |
| `01-welcome.png` | Closed-curtain welcome | Cue + RELAY marquee + Explore / How it works |
| `02-discover.png` | Discover stream | Ticket (Cowen BTC thesis), audience, cord, nav |
| `03-interval.png` | Interval / Showtime | Curtains closed; Pick/Source/Watch/Update; live watch strip |
| `04-discover-ticket-2.png` | Discover · next ticket | Stream scroll |
| `05-profile-arthur-hayes.png` | Profile | Unclaimed public-source profile |
| `05-profile-benjamin-cowen.png` | Profile | Same pattern |
| `05-profile-peter-brandt.png` | Profile | Same pattern |
| `06-idea-cowen-btc-83k-line.png` | Idea timeline | Manual coverage, source card |
| `06-idea-brandt-total2-cup-handle.png` | Idea timeline | |
| `06-idea-brandt-btc-bottom-oct-4.png` | Idea timeline | Uncertain later-item relationship |
| `06-idea-hayes-ai-credit-deflation.png` | Idea timeline | Author-linked update |
| `07-updates-empty.png` | Updates | Empty / nothing watched |
| `08-updates-watching.png` | Updates | Real change for Hayes after seeded local watch |
| `09-watchlist-ideas.png` | Watchlist · Ideas | Browser-local watch |
| `09-watchlist-profiles.png` | Watchlist · Profiles | |
| `09-watchlist-plans.png` | Watchlist · Plans | Empty (no saved plans) |
| `09-watchlist-receipts.png` | Watchlist · Receipts | Empty |
| `10-plans-feed.png` | Plans | **Empty:** “No open plans right now” |
| `11-plans-creators.png` | Plan creators | Empty index |
| `13-account.png` | Account | Google optional; wallet; Cue toggle; **Follow locked**; swaps unavailable on public devnet |
| `14-about.png` | About | How Relay works |
| `15-demo.png` | `/demo` | Fictional walkthrough (labelled) |
| `16-dev-plan-states.png` | `/dev/plan-states` | Dev-only fixtures (404 in production) |
| `17-discover-phone.png` | Discover 390×844 | Tab bar + ticket + audience |
| `18-plans-phone.png` | Plans phone | Same empty Plans |
| `19-account-phone.png` | Account phone | |

**Not captured:** plan detail `/plans/:planPda`, creator detail with plans, follow review, or receipt — because the plans feed was empty.

### App routes (canonical)

| Route | Role |
| ----- | ---- |
| `/` | Discover stream |
| `/profiles/:traderId` | Public-source profile |
| `/ideas/:ideaId` | Idea + timeline |
| `/updates` | Changes since browser cursors |
| `/watchlist` | Ideas / Profiles / Plans / Receipts tabs |
| `/plans`, `/plans/:planPda`, `/plans/creators[/:address]` | Native plans |
| `/account` | Sign-in, wallet, Cue, network |
| `/about` | Product explanation |
| `/demo` | Fictional demo (labelled) |
| `/dev/plan-states` | Dev fixtures only |

Redirects (not screens): `/traders*`, `/ideas/`, `/search`, `/me`, `/how-it-works`, `/records/:pda` → plans.

---

## 4. What already works (do not “fix” by inventing data)

### Discovery

- Curated profiles (Hayes, Cowen, Brandt) and 4 ideas load from Postgres via `/discovery/*`.
- Idea pages show provenance, relationship vocabulary, evidence summary.
- Automatic feed: `GET /discovery/feed` (RSS/Atom from `feeds.json`, ~30 min poll).
- Watch + Updates + Watchlist Ideas/Profiles: localStorage store + `GET /discovery/changes`.
- Theatre Discover UI (stream, Interval, audience, cord) is the active Discover surface.
- Welcome / Meet Cue / reduced-motion rules per PRODUCT.

### Program + plans plumbing (code exists)

Anchor instructions (program ID in tree: `Dzm5tgMCdhJZfXeHYuALst4hvZYiCebfyKf1ctx6WBF6` — confirm against deploy docs before assuming live):

- `create_plan` / `revise_plan` / `close_plan`
- `begin_follow` / `finish_follow` (exactly one swap between them)

Server:

- `GET /plans/feed`, `GET /plans/:planPda`, `POST /plans/:planPda/confirm`
- `POST /follow/quote`, `POST /follow/verify`, `GET /me/executions`
- `GET /prices`, chain sync into Postgres
- On public **devnet**, `swapsAvailable` is false → quote returns `swaps_unavailable` (honest; Account copy matches)

### Auth

- Google OAuth optional for Account (`/auth/google*`). PRODUCT says Discover needs no account; **wallet** is the gate for Follow. There is an open owner question: Google still gates “Review trade” in places — resolve, do not silently keep both stories.

---

## 5. Inconsistencies to fix (ordered)

### P0 — Plans looks abandoned next to Discover

**Symptom:** Discover is full; Plans says no open plans; Account locks Follow; Watchlist Plans/Receipts empty.

**Cause:** No mirrored onchain plans on the environment under test + public devnet has no Jupiter venue.

**Backend work**

1. Ensure chain sync is healthy (`/health/ready`, server logs `chain_sync_failed`).
2. Populate plans for the demo environment:
   - **Preferred for Follow rehearsal:** Surfpool localnet + `NETWORK=localnet` + `JUPITER_DEXES=…` + `bun run --cwd server seed` (see `docs/spikes/surfpool-jupiter.md`, `server/README.md`).
   - **Public-devnet demo of Plans UI only:** owner deploys program + creates a plan ([runbooks/DEVNET_RELEASE.md](runbooks/DEVNET_RELEASE.md)); Follow may still be unavailable until simulated venue path is used.
3. When feed is empty, distinguish **“no plans on chain”** vs **“RPC/sync broken”** in API and UI copy.
4. After seed/deploy: verify `GET /plans/feed` non-empty, open `/plans/:pda`, confirm text hash path, show entry status vocabulary.

**Program work**

1. Confirm deploy target and IDL (`bun run program:build:devnet`, owner deploy, `bun run sync-idl`).
2. Seed or publish: `create_plan` with real `content_hash`; optional `revise_plan` / `close_plan` so history screens are non-empty.
3. For Follow consistency: exercise `begin_follow` → one swap → `finish_follow` on a network where swaps work (localnet/simulated venue), then `POST /follow/verify` so Receipts populate.
4. **Do not** add onchain Watch/Updates/discovery PDAs — PRODUCT forbids that.

### P0 — Follow / Google story

- Align UI with PRODUCT: wallet-only for Follow, or document Google unlock as an explicit owner exception and show it clearly.
- Keep Account network blurb accurate: “swaps not available on this cluster” when `swapsAvailable` is false.

### P1 — Discovery ops (consistency without changing product)

| Gap | Action |
| --- | ------ |
| Evidence Ask looks dead if nothing is reviewed | Operate `bun run --cwd server review …`; do not fake answers |
| Updates “caught up” when cursor is at tip | Expected; rehearse by moving `after` in localStorage, not by inventing events |
| Coverage staleness | `curate --report`, keep feeds poll on; UI already shows last recorded time |
| Wallet-data provider `none` | Deferred research doc; do not wire PnL into profiles |

### P2 — Explicitly deferred (do not implement for “polish”)

Automatic X/Telegram ingest · creator claiming · notifications · leaderboards · inferred PnL · mainnet · copy trading.

### UI polish seen in captures (frontend only)

- Interval scene frames can look incomplete mid-animation (Watch/Update empty in one capture frame).
- Discover responsive/audience/ticket stub: recent work in `IdeaStream`, `Audience`, `interval.css`, `audience.css`, `stream.css` — re-verify on phone PNG `17-discover-phone.png`.
- Cue must not appear over closed Interval curtains (`CueCursor` + `html[data-showtime]`); end Cue card removed when curtains close at stream end.

---

## 6. API cheat sheet (server)

Public under `/api` in production (Caddy strips prefix). Dev: Vite proxies to `:3001`.

**Discovery**

- `GET /discovery/traders`, `/traders/:id`
- `GET /discovery/ideas`, `/ideas/:id`
- `GET /discovery/feed`
- `GET /discovery/changes?watch=idea:id:seq&watch=trader:id:seq`
- `POST /discovery/evidence-requests`, `…/:id/submissions`
- `GET /discovery/me/requests`

**Plans**

- `GET /plans/feed`, `GET /plans/:planPda`, `POST /plans/:planPda/confirm`
- `POST /follow/quote`, `POST /follow/verify`
- `GET /me/executions?follower=`
- `GET /prices`

**Health**

- `GET /health`, `GET /health/ready` (DB + RPC + provider flags)

**Auth**

- `GET /auth/google`, callback, `GET /auth/me`, `POST /auth/logout`

Curation load: `bun run --cwd server curate` (check with `--check`, report with `--report`). Database target guard: refuse remote DB unless `--confirm-db-host`.

---

## 7. Local development (discovery green path)

From repo root (one `.env` from `.env.example`):

```bash
bun install
docker compose -f compose.dev.yaml up -d
bun run --cwd server curate --check
bun run dev:server          # :3001, migrates
bun run --cwd server curate # load curated.json
bun run dev:app             # :5173
```

Verify:

```bash
curl -s http://localhost:3001/health/ready
curl -s http://localhost:3001/discovery/ideas | head -c 200
curl -s 'http://localhost:3001/plans/feed?limit=5'
bun run lint
(cd domain && bun test && bunx tsc -p tsconfig.json)
(cd server && bun test && bunx tsc -p tsconfig.json)  # needs docker Postgres + relay_test
(cd app && bun test && bunx tsc -b)
bun run --cwd app e2e   # needs app + API up
bun run --cwd app screens
```

Program (WSL for Anchor on Windows hosts):

```bash
bun run program:build
bun run program:test
bun run sync-idl
```

---

## 8. Host the whole app (production-shaped)

Canonical runbook: [DEPLOYMENT.md](../DEPLOYMENT.md). Summary for the agent:

### Architecture

```
Browser ──HTTPS──> Caddy
                     /api/*  → strip → server :3001
                     /*      →         app    :3000
server ──> Postgres (compose volume or Neon)
server ──> Solana devnet RPC
```

Program is **not** in Docker. Owner deploys from their machine with their keypair (agent never holds funded keys).

### Steps (EC2 + Docker Compose)

1. Ubuntu host, Docker Engine + Compose; open **80/443** only (not 3000/3001/5432).
2. DNS `A` → Elastic IP.
3. Clone repo, `cp .env.example .env`, set at least:
   - `NETWORK=devnet`
   - `DOMAIN=your.domain`
   - `POSTGRES_PASSWORD=…` **or** `DATABASE_URL` (Neon)
   - Optional: `SOLANA_RPC_URL`, `JUPITER_API_KEY`, Google OAuth vars, `CREATOR_ALLOWLIST`
4. `docker compose up -d --build`
5. Check: `https://DOMAIN/` , `https://DOMAIN/api/health` → `{"ok":true}`, `docker compose ps` healthy.
6. Load discovery data against the **production** DB with explicit host confirm:
   ```bash
   bun run --cwd server curate --confirm-db-host <host>
   ```
7. Owner: deploy program per [runbooks/DEVNET_RELEASE.md](runbooks/DEVNET_RELEASE.md), `sync-idl`, rebuild app if IDL/program id changed.
8. Updates: `git pull && docker compose up -d --build` (remember `NETWORK` / `VITE_*` bake at build time).

### After host: make Plans consistent

1. Confirm `/api/health/ready` shows database + rpc ok.
2. Publish or seed at least one plan on the network the server mirrors.
3. Confirm `/api/plans/feed` lists it and the UI Plans tab is non-empty.
4. Decide Follow story: localnet/simulated venue for executable Follow, or keep public-devnet read-only with matching copy.
5. Re-run `bun run --cwd app screens` against the hosted origin (`E2E_BASE_URL=https://DOMAIN E2E_API_URL=https://DOMAIN/api`) if CORS/proxy allows, or capture via Playwright CLI.

### Status note from DEPLOYMENT.md

Compose config is validated; a full `docker compose up --build` on a real domain with healthy `ps` was **not** completed in the audit session. Treat first production bring-up as a verification task.

---

## 9. Suggested agent work plan

Work **one milestone at a time**. Propose commits on a feature branch; do not push unless asked.

1. **Verify green discovery** on local stack; fix any regression from recent Discover UI work (tests: `app/test/discovery-responsive-polish.test.ts`, e2e journey).
2. **Plans P0:** sync + seed/deploy so Plans feed and one plan detail are real; update empty-state copy if sync failed.
3. **Follow P0:** localnet path or honest read-only; resolve Google vs wallet gate.
4. **Evidence ops:** document/run review CLI so Ask → timeline is real.
5. **Host:** follow DEPLOYMENT.md; curate into prod DB; health checks; optional second screenshot pass.
6. **Update** [ROADMAP.md](ROADMAP.md) only if a milestone actually finishes.

### Commands the agent should prefer

```bash
bun run --cwd app screens          # visual audit
bunx playwright-cli --help         # interactive CLI
bun run --cwd server curate --report
bun run --cwd server check-network
```

### Hard rules (repeat)

- Devnet only; no mainnet.
- Never invent traders, posts, wallets, or PnL.
- Never show a failed follow as a participation.
- Trust chain for plan amounts/outcomes; re-read on verify.
- Fictional routes stay labelled; `/dev/plan-states` absent from production builds.
- Agent does not deploy or hold funded keypairs.

---

## 10. Dataset snapshot at audit time

| Kind | Count / ids |
| ---- | ----------- |
| Traders | `arthur-hayes`, `benjamin-cowen`, `peter-brandt` |
| Ideas | `cowen-btc-83k-line`, `brandt-total2-cup-handle`, `brandt-btc-bottom-oct-4`, `hayes-ai-credit-deflation` |
| Feed items | Present (sample ids numeric from API) |
| Plans in feed | **0** |

---

## 11. Thanks / continuity

This handoff consolidates the 2026-10-12 Playwright screen audit and the consistency analysis for backend + Solana program + hosting. Prefer this file plus PRODUCT/ROADMAP over chat memory. When you finish a phase, leave a short result note in ROADMAP and refresh `docs/screenshots/audit-*` if UI or Plans population changed materially.
