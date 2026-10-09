# server

The Relay backend, built with [Hono](https://hono.dev) on [Bun](https://bun.sh), with Postgres.

## Purpose

Serve the feed and plan pages, and store the offchain text of plans. **The Solana program is the source of truth**: the server copies plan and version accounts from the chain into Postgres, computes the advisory entry status, and accepts a plan's text only if its hash equals the `content_hash` committed onchain. It never decides who published a plan and never trusts amounts sent by a client. The app needs this server for the feed (it is no longer optional); when it is down the app shows a service-unavailable state.

## Endpoints

Reached publicly under `/api` (Caddy and the Vite dev proxy strip the prefix).

| Method | Path | What it does |
|---|---|---|
| `GET` | `/health` | Liveness: `{ "ok": true }`. |
| `GET` | `/health/ready` | Checks the database connection. |
| `GET` | `/feed?pair&cursor&limit` | Ranked plan cards with the advisory entry status. Deterministic ranking; never ranked by claimed return. |
| `GET` | `/plans/:planPda` | One plan with every version, its text (or `null` when unverified) and its hash chain. |
| `POST` | `/plans/:planPda/confirm` | Stores a version's text if it matches the onchain `content_hash`. Idempotent. |
| `GET` | `/prices` | Advisory reference prices and their age. |

Every state-changing request must come from the configured `APP_ORIGIN` (or be `Sec-Fetch-Site: same-origin`) with `Content-Type: application/json`. Bodies are limited to 16 KB and requests are rate limited per client (the right-most `X-Forwarded-For` entry, which the proxy appends).

## Environment variables

| Name | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port to listen on. |
| `APP_ORIGIN` | `http://localhost:5173` | The one browser origin allowed to write. Must be exactly an origin. |
| `DATABASE_URL` | `postgres://relay:relay_local_only@127.0.0.1:5432/relay` | Runtime connection. May be a pooled URL (then disable prepared statements). |
| `DATABASE_DIRECT_URL` | `DATABASE_URL` | Direct connection used only for migrations. |
| `SOLANA_RPC_URL` | `http://127.0.0.1:8899` | RPC endpoint the server reads (never sent to the browser). |
| `SOLANA_CLUSTER` | `localnet` | `localnet` (a Surfpool fork), `devnet` or `mainnet`. On `localnet` the server follows the chain clock, which time travel can move. |
| `JUPITER_API_KEY` | none | Optional, server-side only. Without one the keyless 0.5 req/s tier applies. |
| `JUPITER_BASE_URL` | `https://api.jup.ag` | |
| `JUPITER_DEXES` | none | Venue allowlist, only used on `localnet` (see `docs/spikes/surfpool-jupiter.md`). |

## Run

From the repo root:

```bash
docker compose -f compose.dev.yaml up -d      # Postgres on 127.0.0.1:5432
bun run dev:server                            # applies migrations, then serves :3001
bun run --cwd server seed                     # optional: real onchain demo plans with labelled fictional creators
bun run --cwd server test                     # needs the dev Postgres and a relay_test database
```

The tests use `postgres://relay:relay_local_only@127.0.0.1:5432/relay_test` (override with `TEST_DATABASE_URL`); create it once with `docker exec <postgres container> psql -U relay -d relay -c "create database relay_test"`.

## Layout

```
src/
├── index.ts         entry: migrate, wire services, serve
├── app.ts           routes and middleware
├── env.ts           typed environment
├── db.ts            Bun.sql client and migration runner
├── middleware.ts    origin guard, rate limiter, ApiError
└── services/        chain reader (Kit), plans, prices, feed ranking
migrations/          SQL files applied in order
scripts/seed-demo.ts real onchain plans with labelled demo creators
test/                API tests (Postgres + an in-memory chain built with the real encoders)
```

## Docker

[`Dockerfile`](Dockerfile) builds the production image. Build it from the repo root (the workspace lockfile lives there): `docker build -f server/Dockerfile .`. See [../DEPLOYMENT.md](../DEPLOYMENT.md).
