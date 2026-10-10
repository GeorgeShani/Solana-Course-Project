# server

The Relay backend, built with [Hono](https://hono.dev) on [Bun](https://bun.sh), with Postgres.

## Purpose

Serve the feed and plan pages, and store the offchain text of plans. **The Solana program is the source of truth**: the server copies plan and version accounts from the chain into Postgres, computes the advisory entry status, and accepts a plan's text only if its hash equals the `content_hash` committed onchain. It never decides who published a plan and never trusts amounts sent by a client. The app needs this server for the feed (it is no longer optional); when it is down the app shows a service-unavailable state.

## Endpoints

Reached publicly under `/api` (Caddy and the Vite dev proxy strip the prefix).

| Method | Path                       | What it does                                                                                                                                                                                                                                                                                                                            |
| ------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/health`                  | Liveness: `{ "ok": true }`.                                                                                                                                                                                                                                                                                                             |
| `GET`  | `/health/ready`            | Readiness: `200` when the database and the Solana RPC both answer, otherwise `503` with `checks: { database, rpc }` saying which is down. The container healthcheck uses `/health`, which must not depend on Solana.                                                                                                                    |
| `GET`  | `/feed?pair&cursor&limit`  | Ranked plan cards with the advisory entry status. Deterministic ranking; never ranked by claimed return. With `CREATOR_ALLOWLIST` set, only those creators' plans are listed.                                                                                                                                                           |
| `GET`  | `/plans/:planPda`          | One plan with every version, its text (or `null` when unverified) and its hash chain. Every card carries `listed`: `false` for a plan whose creator is not on the allowlist (reachable by link, not in the feed).                                                                                                                       |
| `POST` | `/plans/:planPda/confirm`  | Stores a version's text if it matches the onchain `content_hash`. Idempotent.                                                                                                                                                                                                                                                           |
| `GET`  | `/prices`                  | Advisory reference prices and their age.                                                                                                                                                                                                                                                                                                |
| `POST` | `/follow/quote`            | `{ planPda, version, follower, quoteAmount }`. Fetches a fresh Jupiter route, composes the follow transaction with the same code the client runs, refuses prices outside the plan's range, simulates it, and returns a plain-language summary plus the exact inputs the client needs to rebuild and sign it. Nothing is signed or sent. |
| `POST` | `/follow/verify`           | `{ signature }` only. Re-reads the transaction and the receipt account from the chain and records the execution as `recorded` or `failed` (with the reason). Idempotent; a recorded execution is never downgraded.                                                                                                                      |
| `GET`  | `/me/executions?follower=` | A wallet's verified executions, newest first.                                                                                                                                                                                                                                                                                           |

Every state-changing request must come from the configured `APP_ORIGIN` (or be `Sec-Fetch-Site: same-origin`) with `Content-Type: application/json`. Bodies are limited to 16 KB and requests are rate limited per client (the right-most `X-Forwarded-For` entry, which the proxy appends).

## Environment variables

| Name                  | Default                                                  | Description                                                                                                                                                                           |
| --------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                | `3001`                                                   | Port to listen on.                                                                                                                                                                    |
| `APP_ORIGIN`          | `http://localhost:5173`                                  | The one browser origin allowed to write. Must be exactly an origin.                                                                                                                   |
| `DATABASE_URL`        | `postgres://relay:relay_local_only@127.0.0.1:5432/relay` | Runtime connection. May be a pooled URL (then disable prepared statements).                                                                                                           |
| `DATABASE_DIRECT_URL` | `DATABASE_URL`                                           | Direct connection used only for migrations.                                                                                                                                           |
| `NODE_ENV`            | none                                                     | `production` turns on the deployment guard: the server refuses to start on `localnet`, without `APP_ORIGIN` (https) or `DATABASE_URL`, or with `DEMO_MODE`.                           |
| `SOLANA_RPC_URL`      | the network's public RPC                                 | RPC endpoint the server reads, and the upstream of `POST /rpc`. Never sent to the browser, so a provider URL with a key is safe here.                                                 |
| `NETWORK`             | `devnet`                                                 | `devnet` or `localnet` (a local test fork, tests only). The old name `SOLANA_CLUSTER` still works. On `localnet` the server follows the chain clock, which time travel can move.      |
| `CREATOR_ALLOWLIST`   | empty                                                    | Comma-separated wallet addresses whose plans the feed lists. Empty lists every plan. A value that is not an address stops the start. A production start with it empty logs a warning. |
| `JUPITER_API_KEY`     | none                                                     | Optional, server-side only. Without one the keyless 0.5 req/s tier applies.                                                                                                           |
| `JUPITER_BASE_URL`    | `https://api.jup.ag`                                     |                                                                                                                                                                                       |
| `JUPITER_DEXES`       | none                                                     | Venue allowlist, only used on `localnet` (see `docs/spikes/surfpool-jupiter.md`).                                                                                                     |

## Operating it

- **Logs** are one JSON object per line on stdout (`docker compose logs server`). Every request logs `request` with its `reqId`, method, path (no query string), status and duration; every response carries the same id in `X-Request-Id`, so a user report can be matched to a line. Errors log `api_error` with the code that stopped the request (`plan_expired`, `swaps_unavailable`, ...). Logs never hold bodies, headers, cookies, signatures, the client address, or any URL (provider keys live in URLs); fields with sensitive names are redacted and error text has URLs stripped.
- **Failures are handled, not hidden.** Every RPC call times out after 10 s. When Jupiter's price API fails or rate-limits, the server stops asking for a growing interval (or the `Retry-After` it was sent) and serves the last good price with its old time, so the app shows "Price may be outdated" instead of a fresh-looking number. The swap router's errors reach followers as `no_route` (422), `rate_limited` (429) or `route_unavailable` (502), never with Jupiter's own text. A feed whose chain sync fails still serves the stored plans and logs `chain_sync_failed` once a minute.
- **Check a network without changing anything:** `bun run --cwd server check-network` reads the root `.env`, asks the RPC a few questions (right network? program deployed? tokens present? price source reachable?) and prints PASS / WARN / FAIL. It sends nothing, signs nothing and does not print the RPC URL.
- Where the network has no swap venue (`NETWORKS[network].swapsAvailable` is false, today devnet), `POST /follow/quote` answers `422 swaps_unavailable` before doing any work.

## Run

From the repo root:

```bash
docker compose -f compose.dev.yaml up -d      # Postgres on 127.0.0.1:5432
bun run dev:server                            # applies migrations, then serves :3001
bun run --cwd server seed                     # optional: real onchain demo plans with labelled fictional creators
bun run --cwd server test                     # needs the dev Postgres and a relay_test database
```

On a Surfpool fork the server must be started with the venue allowlist, or Jupiter may pick a private AMM (such as GoonFi) that cannot execute on stale fork state:

```bash
NETWORK=localnet JUPITER_DEXES="Orca V2,Raydium CLMM,Meteora DLMM,Raydium" bun run dev:server
bun run --cwd server scripts/follow-via-api.ts   # a follower end to end through the API, plus a recorded failure
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
└── services/        chain reader (Kit), plans, follow (quote/verify), jupiter client, prices, feed ranking
migrations/          SQL files applied in order
scripts/seed-demo.ts real onchain plans with labelled demo creators
scripts/follow-via-api.ts a follower end to end through the HTTP API
test/                API tests (Postgres + an in-memory chain built with the real encoders)
```

## Docker

[`Dockerfile`](Dockerfile) builds the production image. Build it from the repo root (the workspace lockfile lives there): `docker build -f server/Dockerfile .`. See [../DEPLOYMENT.md](../DEPLOYMENT.md).
