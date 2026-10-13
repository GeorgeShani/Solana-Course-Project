# Demo runbook

How to show Relay honestly. Two parts, never mixed. Product rules: [../../PRODUCT.md](../../PRODUCT.md).

## Before you start

1. Local Postgres up: `docker compose -f compose.dev.yaml up -d` (or the Neon database in `.env`).
2. **Check the database target.** The root `.env` may point at a remote database. For a local demo: from `server/`, `DATABASE_URL=postgres://relay:relay_local_only@127.0.0.1:5432/relay DATABASE_DIRECT_URL=<same> APP_ORIGIN=http://localhost:5173 NETWORK=devnet bun run src/index.ts`.
3. Load the real records: `bun run --cwd server curate --report` (read the warnings), then load with `bun run scripts/curate.ts` from `server/` against the database you name.
4. App: `bun run --cwd app dev --port 5173 --strictPort`. Clear this site's storage so the welcome shows.
5. `DOMAIN` in `.env` must be a bare host (no `https://`); a scheme breaks Google return and CORS.

## 2–3 minute product demo (Part 1 only)

Narration limits: "recorded by hand from public sources"; never "live", "verified trader", "returns" or "signal".

| Time | Click                                                   | Say                                                                                                          |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 0:00 | Clean `/`                                               | "Relay is a memory for traders' public ideas." Welcome: Cue, **See the original idea. Follow what changed.** |
| 0:15 | **Explore ideas**                                       | Discover: one idea at a time. Titles, author, source, date, update status.                                   |
| 0:35 | Hayes card → **Open story**                             | Original idea first. Timeline: later essay is **Author update** — he links it himself.                       |
| 1:00 | **Open the original**                                   | Exact Substack link. Close the tab; stay on Relay.                                                           |
| 1:15 | Expand **What Relay can and cannot establish**          | Statement and link, not a trade or a result.                                                                 |
| 1:30 | **Watch** → **Watchlist**                               | Real title and author. "Stored in this browser only."                                                        |
| 1:50 | (Optional) set cursor back, open **Updates** → **Open** | Shows **Newly recorded by Relay** or **Newly published**. Open lands on the exact timeline entry.            |
| 2:10 | Brandt idea (Discover or profile)                       | Later item is **Link not established** — Relay could not confirm the link.                                   |
| 2:30 | Header → Account (optional)                             | Sign-in is only for following plans; wallet is separate; watching needs neither.                             |

Stop here for a discovery-only recording. Do not open Plans unless Part 2 is ready.

## Part 1 checklist (longer rehearsal)

1. Clean `/` shows the welcome. **Explore ideas**.
2. Discover: browsing controls, **Open story** / **Open source** / **Watch**.
3. **Arthur Hayes → "AI-driven credit deflation"**. **Author update** with his own sentence in the note. **Open the original**.
4. **What Relay can and cannot establish** (expandable).
5. **Peter Brandt → "Bitcoin's cycle bottom…"**. **Link not established**.
6. **Watch** → reload → **Watchlist** (live title) → **Updates** (cursor rehearsal if needed).
7. Header account icon stays generic until Google sign-in; after sign-in it shows the avatar.

## Part 2: native plans (optional, devnet)

Needs the devnet plans from [DEVNET_REHEARSAL.md](DEVNET_REHEARSAL.md) (they expire; check the date and republish if needed) and `/follow/status` reporting `available: true`. Say the network out loud: devnet, test tokens, no value. Also say the venue price is a fixed test price, not the market.

1. Sign in with Google (Account). Following is gated on it; reading and watching are not.
2. Plans → open a plan → show **Published through Relay**, the network badge and the entry range. An entry status states whether the price is inside the stated range; it is never advice.
3. **Review trade** → amount → **Get quote**. Connect a Wallet Standard wallet set to Solana Devnet and approve in the popup. Never ask the audience to use a real-funds wallet.
4. Watchlist → Receipts shows the **Verified receipt**, re-read from the chain. A failed transaction is never shown as a receipt.

If Follow reports unavailable, or no wallet popup can be shown, say so and stop. Do not substitute fixtures. The wallet popup path has not yet been rehearsed with a real extension; only a CLI-signed follow has been verified.

## The fictional fallback

`/demo` is an educational walkthrough with an invented trader and simulated prices, bannered "Fictional demo". Announce that before opening it. `/dev/plan-states` exists only in development builds (404 in production).

## Checks before presenting

`bun run lint`; `(cd domain && bun test)`; `(cd server && bun test)`; `(cd app && bunx tsc -b && bun run test)`. Try phone width, reduced motion, and the server stopped (the app must say it cannot reach Relay's service).

## Limits (say these if asked)

- Coverage is manual; Relay does not watch accounts live.
- Profiles are unclaimed public-source pages.
- Watching and the watchlist are browser-local, not synced to Google sign-in.
- Plans are optional and separate. Follow runs on devnet only, through a simulated venue at a fixed test price; there is no mainnet.
