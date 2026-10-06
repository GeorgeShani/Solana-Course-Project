# Deployment

A proposal for deploying the app as **one stack on one origin**. Nothing here is implemented yet: there is no Dockerfile or compose file in the repo, and the snippets below are sketches to adapt once the idea (and so the real requirements) is chosen. They have not been run.

## Summary

| Question | Recommendation |
|---|---|
| Packaging | Docker, one image per service (`app`, `server`), orchestrated with Docker Compose |
| One app | A reverse proxy (Caddy) puts both services behind a single domain: `/api/*` goes to Hono, everything else to the SSR app |
| Hosting | One small VPS (e.g. Hetzner, DigitalOcean) running Docker Compose. Caddy handles HTTPS automatically |
| On-chain program | **Not** in Docker. Deployed to Solana with `anchor deploy` (devnet first, then mainnet) |
| Alternatives | Railway (monorepo, multiple services, GitHub deploys) or Fly.io (two apps, or one app with two processes) if you don't want to run a server |

Why a VPS with Compose: the repo is already two Bun processes, the compose file is the single description of the whole system, it works the same locally and in production, and a few euros a month covers a course project. Managed platforms (Railway, Fly.io) are the better choice if you'd rather not patch an OS or manage a server; the Dockerfiles below work there unchanged.

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

## Things to know before writing the Dockerfiles

1. **`VITE_*` variables are baked in at build time.** `VITE_RPC_URL` and `VITE_API_URL` are inlined into the client bundle by `vite build`. They must be passed as Docker **build args**, not runtime env vars. Changing them means rebuilding the image.
2. **Anything in `VITE_*` is public.** Don't put a paid RPC provider key there unless it is restricted by domain. Otherwise proxy RPC calls through the Hono server.
3. **The SSR bundle is not self-contained.** `app/dist/server/server.js` imports `react`, `@tanstack/react-router` and `buffer` at runtime, so the runtime image needs production `node_modules`, not just `dist/`.
4. **Bun workspaces.** Install from the repo root with `package.json`, `bun.lock`, and each workspace's `package.json` copied in first, so the dependency layer is cached.
5. **`server/` has no production script yet.** `server/package.json` only defines `dev` (`bun run --hot`). Add a `start` script (`bun run src/index.ts`) before containerising it.
6. **Healthchecks.** The server already has `GET /health`. The app has none; add a tiny route or check `GET /`.
7. **`program/` stays out of the images.** Add a `.dockerignore` that excludes `program/`, `docs/`, `**/node_modules`, `.git`, and `target/`.

## Proposed files

### `Dockerfile.app`

```dockerfile
# syntax=docker/dockerfile:1
FROM oven/bun:1 AS deps
WORKDIR /repo
COPY package.json bun.lock ./
COPY app/package.json app/
COPY server/package.json server/
RUN bun install --frozen-lockfile

FROM deps AS build
COPY app app
ARG VITE_RPC_URL
ARG VITE_API_URL=/api
ENV VITE_RPC_URL=$VITE_RPC_URL VITE_API_URL=$VITE_API_URL
RUN bun run --cwd app build

FROM oven/bun:1 AS prod-deps
WORKDIR /repo
COPY package.json bun.lock ./
COPY app/package.json app/
COPY server/package.json server/
RUN bun install --frozen-lockfile --production

FROM oven/bun:1-slim AS run
WORKDIR /repo
ENV NODE_ENV=production PORT=3000
COPY --from=prod-deps /repo/node_modules node_modules
COPY --from=prod-deps /repo/app/node_modules app/node_modules
COPY --from=build /repo/app/dist app/dist
COPY app/serve.ts app/package.json app/
WORKDIR /repo/app
USER bun
EXPOSE 3000
CMD ["bun", "run", "serve.ts"]
```

Both Dockerfiles live at the repo root, and the build context is the root, so the workspace files are visible.

### `Dockerfile.server`

```dockerfile
# syntax=docker/dockerfile:1
FROM oven/bun:1-slim
WORKDIR /repo
ENV NODE_ENV=production PORT=3001
COPY package.json bun.lock ./
COPY app/package.json app/
COPY server/package.json server/
RUN bun install --frozen-lockfile --production
COPY server server
WORKDIR /repo/server
USER bun
EXPOSE 3001
CMD ["bun", "run", "src/index.ts"]
```

### `compose.yaml`

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.app
      args:
        VITE_RPC_URL: ${VITE_RPC_URL:?set in .env}
        VITE_API_URL: /api
    restart: unless-stopped
    expose: ["3000"]

  server:
    build:
      context: .
      dockerfile: Dockerfile.server
    restart: unless-stopped
    expose: ["3001"]
    healthcheck:
      test: ["CMD", "bun", "-e", "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    environment:
      DOMAIN: ${DOMAIN:?set in .env}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [app, server]

volumes:
  caddy_data:
  caddy_config:
```

### `Caddyfile`

```caddyfile
{$DOMAIN} {
	encode zstd gzip
	handle_path /api/* {
		reverse_proxy server:3001
	}
	handle {
		reverse_proxy app:3000
	}
}
```

`handle_path` strips the `/api` prefix, so the Hono route `/health` is reachable at `/api/health` with no code change.

### `.env` (git-ignored; `.gitignore` already covers `.env`)

```
DOMAIN=example.com
VITE_RPC_URL=https://api.devnet.solana.com
```

## Deploy steps (VPS)

1. Create a small Ubuntu VPS, point your domain's `A` record at it, and install Docker Engine and the Compose plugin.
2. Open ports 80 and 443 only (firewall), plus SSH.
3. Clone the repo, create `.env` with `DOMAIN` and `VITE_RPC_URL`.
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

## Open items

- Add `start` script to `server/package.json`.
- Add a health route to the app.
- Add `.dockerignore`, `Dockerfile.app`, `Dockerfile.server`, `compose.yaml`, `Caddyfile` (above), then build and test them with Docker; this has not been done.
- Decide the production RPC provider and how its key is protected.
- Decide devnet-only vs. mainnet once the idea is chosen.
