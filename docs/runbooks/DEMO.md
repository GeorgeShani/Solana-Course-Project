# Demo runbook

How to show Relay honestly. Two parts, never mixed. Product rules: [../../PRODUCT.md](../../PRODUCT.md).

## Before you start

1. Local Postgres up: `docker compose -f compose.dev.yaml up -d`.
2. **Check the database target.** The root `.env` may point at a remote database. For a demo use the local one: from `server/`, `DATABASE_URL=postgres://relay:relay_local_only@127.0.0.1:5432/relay DATABASE_DIRECT_URL=<same> APP_ORIGIN=http://localhost:5175 NETWORK=devnet bun run src/index.ts`.
3. Load the real records: `bun run --cwd server curate --report` (read the warnings), then the same variables with `bun run scripts/curate.ts` from `server/`.
4. App: `bun run --cwd app dev --port 5175 --strictPort`. Clear this site's storage so the welcome shows.

## Part 1: the product (public-source records, no wallet)

Narration limits: say "recorded by hand from public sources"; never say "live", "verified trader", "returns" or "signal".

1. Clean `/` shows the welcome. **Explore ideas**.
2. Discover: three profiles, each "Public-source profile · Not claimed by the author".
3. Open **Arthur Hayes → "AI-driven credit deflation"**. Original source and time; the later essay is **"Author update"** with his own sentence quoted in the note. **Open the original** (exact link).
4. Read "What Relay can and cannot establish": the record shows a statement and a link, not a trade or a result.
5. Open **Peter Brandt → "Bitcoin's cycle bottom…"**. The later item reads **"Link not established"**: say plainly that Relay could not confirm what it refers to.
6. **Watch** the idea, reload, open **Updates**: nothing is new yet ("You're caught up"). A change appears only when a curator records a new entry; to rehearse, set the stored cursor back by hand (`relay:discovery-watch:v1`, field `after`) and show **Open this entry in the timeline**.
7. Header → **Meet Cue** reopens the welcome; Account → **Show welcome** does the same.

## Part 2: native plans (optional, devnet)

Only with a deployed program, a funded creator and a follower, all on **devnet** (test tokens): see [DEVNET_RELEASE.md](DEVNET_RELEASE.md). Say the network out loud. Show **Plans → a plan → Published through Relay**, its entry status, and the receipt on the explorer. If no real devnet plan exists, skip Part 2; do not substitute fixtures.

## The fictional fallback

`/demo` is an educational walkthrough with an invented trader and simulated prices, bannered "Fictional demo". Announce that before opening it, show it only when explaining empty or error behaviour, and never alongside Part 1 as if it were the same data. `/dev/plan-states` exists only in development builds (404 in production) and is not for presentations.

## Checks before presenting

`bun run lint`; `(cd domain && bun test)`; `(cd server && bun test)`; `(cd app && bunx tsc -b && bun test)`; `bun run build:app`. Try phone width, keyboard-only navigation, reduced motion, and the server stopped (the app must say it cannot reach Relay's service, not show stale or invented data).
