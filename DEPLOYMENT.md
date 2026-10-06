# Deployment

How to deploy the app as **one stack on one origin**, with Docker Compose and Caddy. The files are in the repo root; see [Status](#status) for what has and has not been tested.

## Summary

| Question | Recommendation |
|---|---|
| Packaging | Docker, one image per service (`app`, `server`), orchestrated with Docker Compose |
| One app | A reverse proxy (Caddy) puts both services behind a single domain: `/api/*` goes to Hono, everything else to the SSR app |
| Hosting | One small VPS (e.g. Hetzner, DigitalOcean) running Docker Compose. Caddy handles HTTPS automatically |
| On-chain program | **Not** in Docker. Deployed to Solana with `anchor deploy` (devnet first, then mainnet) |
| Alternatives | Railway (monorepo, multiple services, GitHub deploys) or Fly.io (two apps, or one app with two processes) if you don't want to run a server |

Why a VPS with Compose: the repo is already two Bun processes, the compose file is the single description of the whole system, it works the same locally and in production, and a few euros a month covers a course project. Managed platforms (Railway, Fly.io) are the better choice if you'd rather not patch an OS or manage a server; the Dockerfiles work there unchanged (each service is one image).

## What gets deployed

```
                   ┌────────────────────── one domain ──────────────────────┐
 browser ──HTTPS──>│ caddy                                                  │
                   │   /api/*  ──strip /api──> server  (Hono, :3001)        │
                   │   /*      ───────────────> app    (SSR, Bun, :3000)    │
                   └────────────────────────────────────────────────────────┘
 browser ──────────────────────────────> Solana RPC (public, from the client)
```

| Piece | Source | Runtime | Port |
|---|---|---|---|
| `app` | `app/` (TanStack Start build, `serve.ts`) | Bun | 3000 |
| `server` | `server/` (Hono) | Bun | 3001 |
| `caddy` | `Caddyfile` | Caddy | 80, 443 |
| Solana program | `program/` | The Solana cluster | n/a |

Serving everything from one origin means the browser never makes a cross-origin call to the Hono server, so no CORS configuration is needed in production.

## Files

| File | Purpose |
|---|---|
| [`app/Dockerfile`](app/Dockerfile) | SSR web app: builds with Vite, runs `app/serve.ts` on Bun (port 3000) |
| [`server/Dockerfile`](server/Dockerfile) | Hono support server on Bun (port 3001) |
| [`Caddyfile`](Caddyfile) | Reverse proxy: `/api/*` to `server` (prefix stripped), everything else to `app` |
| [`compose.yaml`](compose.yaml) | Runs `app`, `server` and `caddy`; only Caddy publishes ports (80, 443) |
| [`.env.example`](.env.example) | `DOMAIN` and `VITE_RPC_URL`; copy to `.env` |
| [`.dockerignore`](.dockerignore) | Keeps `program/`, `docs/`, `node_modules`, `dist` and secrets out of the build context |

Each Dockerfile sits next to the code it builds, but both images are built with the **repo root as the build context** (`context: .` in `compose.yaml`, `docker build -f app/Dockerfile .`). The root holds the single Bun workspace lockfile (`bun.lock`), so a per-folder context would not see it. Each installs only its own workspace (`bun install --filter app` or `--filter server`).

## Things to know

1. **`VITE_*` variables are baked in at build time.** `VITE_RPC_URL` and `VITE_API_URL` are inlined into the client bundle by `vite build`, so they are Docker **build args**, not runtime env vars. Changing `VITE_RPC_URL` in `.env` means `docker compose up -d --build`.
2. **Anything in `VITE_*` is public.** Don't put a paid RPC provider key there unless it is restricted by domain; otherwise proxy RPC calls through the Hono server.
3. **The SSR bundle is not self-contained.** `app/dist/server/server.js` imports `react`, `@tanstack/react-router`, `@solana/web3.js` and others at runtime, so the app image carries production `node_modules`, not just `dist/`.
4. **Healthchecks.** `server` is checked on `GET /health`. `app` is checked on the static `/favicon.svg`, on purpose: checking `/` would make every probe call the Solana RPC, and a slow RPC would mark the app unhealthy. Caddy starts only once both are healthy, so if a healthcheck fails, nothing listens on ports 80/443 and the browser shows "connection refused". Healthchecks use `127.0.0.1`, not `localhost`: Bun listens on IPv4 only, and `localhost` may resolve to `::1` inside the container.
5. **`program/` stays out of the images** (see `.dockerignore`). It is deployed to Solana separately, below.
6. **Local test.** `DOMAIN=localhost` makes Caddy serve a locally issued certificate (your browser will warn unless you trust Caddy's local CA), so `docker compose up --build` is a production-like run on your machine.

## Deploy steps (VPS)

1. Create a small Ubuntu VPS, point your domain's `A` record at it, and install Docker Engine and the Compose plugin.
2. Open ports 80 and 443 only (firewall), plus SSH.
3. Clone the repo, then `cp .env.example .env` and set `DOMAIN` and `VITE_RPC_URL`.
4. `docker compose up -d --build`. Caddy fetches a TLS certificate on first request.
5. Check `https://<domain>/` renders (view-source shows server-rendered HTML) and `https://<domain>/api/health` returns `{"ok":true}`.
6. Update: `git pull && docker compose up -d --build`.

For hands-off updates, add a GitHub Actions workflow that builds the images, pushes them to GHCR, and runs `docker compose pull && docker compose up -d` on the server over SSH. Worth doing once the app is stable.

## Deploying the Solana program

The program is deployed independently of the containers:

1. Set `cluster = "devnet"` in `program/Anchor.toml` and fund the deploy keypair (`solana airdrop 2`).
2. `bun run program:build`, then `bun run program:deploy`.
3. `bun run sync-idl` so the app's IDL matches, then rebuild the app image.
4. For mainnet, deploy from a dedicated keypair, and back up `program/target/deploy/<name>-keypair.json`: losing it means you can no longer upgrade the program. Consider transferring the upgrade authority to a multisig.

The app's `VITE_RPC_URL` must point at the same cluster the program is deployed to.

## Alternative: a single container

If you want literally one process, mount the Hono routes inside the TanStack Start app through a catch-all server route (`/api/$` delegating to `app.fetch`). That removes the second image and Caddy's path routing, at the cost of coupling the support server's lifecycle to the web app. This repo keeps them separate on purpose: the server must stay optional, and the app should keep working if it is down. Only switch if operating two services becomes a burden.

## Status

Checked in a sandbox **without a Docker daemon**, so no image has been built or run yet:

- `docker compose config` accepts `compose.yaml` and fails with a clear message when `DOMAIN` or `VITE_RPC_URL` is missing.
- `caddy validate` accepts the `Caddyfile`, and a real Caddy run with the upstreams pointed at local processes routed `/api/health` to the Hono server and `/` to the SSR app.
- The same file sets the images copy (production-only `bun install --filter ...`, `app/dist`, `serve.ts`) were assembled by hand and both services ran from them.

Still to do on a machine with Docker:

- `docker compose up --build`, then open `https://localhost/`, check `https://localhost/api/health` returns `{"ok":true}`, and `docker compose ps` shows every service healthy.
- Decide the production RPC provider and how its key is protected.
- Decide devnet-only vs. mainnet once the idea is chosen.
- Optional: a GitHub Actions workflow that builds the images, pushes them to GHCR, and redeploys over SSH.

## Troubleshooting

If the browser says "connection refused":

```bash
docker compose ps -a          # is every service running and healthy?
docker compose logs --tail=50 # why not?
```

- `app` or `server` **unhealthy**: Caddy waits for them and never starts. Read that service's logs.
- **Build failed**: `docker compose up --build` prints the failing step.
- `DOMAIN`/`VITE_RPC_URL` missing: Compose stops immediately; create `.env` from `.env.example`.
- Only Caddy publishes ports (80 and 443). `http://localhost:3000` and `:3001` are intentionally **not** reachable from the host; use `https://localhost/` and `https://localhost/api/health`.
