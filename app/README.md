# app

The frontend: React + [TanStack Start](https://tanstack.com/start) (server-side rendering, built on Vite) + TypeScript, managed with bun.

## Stack

- React 19, TanStack Start + TanStack Router (SSR, file-based routes), Vite, TypeScript
- `@solana/kit` for RPC (the maintained Solana SDK; `@solana/web3.js` v1 is deprecated)
- `@relay/domain/solana` as the typed client for the Relay program: account codecs, instruction builders and PDAs, checked against the generated IDL

## Current state

Relay's primary journey is **Welcome → Discover → profile → idea timeline → Watch → Updates → source**, all from public-source editorial records served by `/discovery` (no wallet, no account). Relay-native plans on Solana devnet are a separate, optional area under **Plans**. See [../PRODUCT.md](../PRODUCT.md) for the product and [../docs/ROADMAP.md](../docs/ROADMAP.md) for what is being built. The design system is in [../DESIGN.md](../DESIGN.md).

When the API is unreachable the app says so ("Can't reach Relay's service") instead of showing invented data. In development builds only, `/dev/plan-states` shows invented plans in every entry status for layout checks (every card is badged FICTIONAL; a production build answers 404 and does not contain the fixtures). It is not the demo. The educational `/demo` walkthrough is separate, always labelled fictional, and never touches real watch data.

## Routes

| Route                       | What it is                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `/`                         | Discover: public-source profiles and ideas. Shows the welcome once to a new visitor.                  |
| `/profiles/:traderId`       | A public-source profile (unclaimed, manual coverage).                                                 |
| `/ideas/:ideaId`            | An idea: original source, later items, what is and is not established.                                |
| `/updates`                  | What changed in the ideas and profiles this browser watches.                                          |
| `/watchlist`                | What this browser saved (stored in this browser only).                                                |
| `/plans`, `/plans/:planPda` | Relay-native plans and their receipts (devnet). `/plans/creators` lists the wallets that signed them. |
| `/account`                  | Wallet, preferences, **Show welcome**.                                                                |
| `/how-it-works`, `/demo`    | The visual explanation; the fictional walkthrough.                                                    |
| `/dev/plan-states`          | Development only: fictional plan-status fixtures.                                                     |

Redirects keep old links working: `/records/:pda` → `/plans/:pda`, `/traders` → `/`, `/traders/:address` → `/plans/creators/:address`, `/ideas` and `/search` → `/`, `/me` → `/watchlist`, `/?plan=:pda` → `/plans?plan=:pda`, `/?welcome=true` → `/` (and opens the welcome).

## Environment variables

There is ONE settings file for the whole repo: `.env` at the repo root (copy `.env.example`). Do not create `app/.env.local`. Vite reads the root file; only `VITE_*` values and `NETWORK` reach the browser, so database and RPC keys stay private.

| Name               | Default                 | Description                                                                                                                                                                                                                    |
| ------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_RPC_URL`     | `/api/rpc`              | Browser RPC endpoint. The default is Relay's own proxy (`POST /rpc` on the server, a fixed method allowlist), so no provider key is baked into the bundle. Set it to `http://127.0.0.1:8899` to talk to a local fork directly. |
| `NETWORK`          | `devnet`                | The Solana network, read from the ONE root `.env` (see `.env.example`). Must equal the server's; shown as the network chip.                                                                                                    |
| `SOLANA_RPC_URL`   | public devnet RPC       | Server-only. RPC used during server render.                                                                                                                                                                                    |
| `VITE_API_URL`     | `/api`                  | Browser path to the Hono server. In dev, Vite proxies `/api` to `127.0.0.1:3001`; in production, Caddy does.                                                                                                                   |
| `INTERNAL_API_URL` | `http://127.0.0.1:3001` | Server-only: where SSR fetches the first feed page.                                                                                                                                                                            |

The server's `APP_ORIGIN` must equal the exact origin you open the app on (for example `http://localhost:5175`), or its writes return 403.

The program ID comes from the IDL, which `bun run sync-idl` copies into `domain/src/solana/relay.idl.json`, so it is not configured here.

## Workflow

From the repo root (macOS or Windows):

```bash
bun install
docker compose -f compose.dev.yaml up -d   # Postgres for the server
bun run dev:server   # Hono API on :3001 (reads the root `.env`)
bun run dev:app      # http://localhost:5173 (add `-- --port 5175 --strictPort` to pin a port)
bun run build:app    # production build (client + SSR bundle) + type-check
bun run --cwd app start   # serve the production build on :3000 (PORT to change)
bun run --cwd app test    # app unit tests
```

The feed is empty until the server has indexed plans: run Surfpool on :8899 and `bun run --cwd server seed`, which signs and sends real fork transactions.

Whenever the program's interface changes:

```bash
bun run program:build   # native on macOS, WSL on Windows
bun run sync-idl        # copies the IDL into domain/src/solana/
```

On Windows, do not run `bun install` from WSL in this folder: it would install Linux-only binaries that Windows can't run.

## Layout

```
src/
├── router.tsx        router factory (TanStack Start entry)
├── routeTree.gen.ts  generated by the Vite plugin; do not edit
├── routes/           file-based routes (see the table above); route files orchestrate
├── components/
│   ├── discovery/    cards, source card, timeline, evidence requests, watch button, changes
│   ├── feed/, trade/ the native plan feed and the follow panel (Plans)
│   ├── theatre/      welcome, curtain, marquee, portraits
│   ├── cue/, ui/, wallet/
├── lib/              discovery*.ts (parsers, labels, queries, watch store), welcome.ts, api.ts and
│                     friends for plans, wallet.ts, fixtures.ts (development-only fictional plans)
└── styles/           tokens, base, theatre, feed, screens, discovery, discover
test/                 bun tests (labels, parsers, welcome boot script, plan logic)
serve.ts              production server (Bun): static assets + SSR handler
```

## Server-side rendering

Routes render on the server by default. Chain reads belong in route loaders or server functions (`createServerFn`), which run on the server and ship the result in the first HTML, good for SEO and fast first paint. Code in `lib/solana.ts` and `@relay/domain/solana` is safe to use on both server and client.

`routeTree.gen.ts` is generated on `vite dev` / `vite build`, so run one of those before type-checking from a fresh clone.

## Docker

[`Dockerfile`](Dockerfile) builds the production image. Build it from the repo root (the workspace lockfile lives there): `docker build -f app/Dockerfile .`. See [../DEPLOYMENT.md](../DEPLOYMENT.md).

## Notes

- **Cluster.** `NETWORK` and `VITE_RPC_URL` are inlined at build time, so changing them needs a rebuild.
