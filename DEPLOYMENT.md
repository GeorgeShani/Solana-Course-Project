# Deployment

How to run Relay on a server: **one stack, one domain**, with Docker Compose and Caddy, on an AWS EC2 instance. Relay runs on Solana **devnet** (free test tokens, no real value), so nothing here costs more than the server.

## Summary

| Question         | Answer                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Where            | One AWS EC2 instance (Ubuntu) running Docker Compose                                                                                |
| What runs        | `caddy` (HTTPS, one domain), `app` (the website, server-rendered), `server` (the API), and `postgres` (or your own hosted database) |
| Network          | Solana devnet. Set once with `NETWORK=devnet` in `.env`                                                                             |
| Settings         | **One file: `.env` in the repo root** (copy `.env.example`)                                                                         |
| On-chain program | Not in Docker. Deployed to devnet from your computer. See [DEVNET_RELEASE.md](docs/DEVNET_RELEASE.md)                               |

```
                   ┌────────────────────── one domain ──────────────────────┐
 browser ──HTTPS──>│ caddy                                                  │
                   │   /api/*  ──strip /api──> server  (API, :3001)         │
                   │   /*      ───────────────> app    (website, :3000)     │
                   └────────────────────────────────────────────────────────┘
 server ───────────────────────────────> Solana devnet RPC (also used for /api/rpc)
```

The browser never talks to Solana or the database directly. It talks to `/api`, and the server talks to Solana. That keeps any RPC provider key private.

## The one settings file

Copy `.env.example` to `.env` and fill in only what you need. On a server you usually set:

| Name                | Needed                            | What it is                                                                      |
| ------------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| `NETWORK`           | yes                               | `devnet`                                                                        |
| `DOMAIN`            | yes (server)                      | Your domain, for example `relay.example.com`                                    |
| `POSTGRES_PASSWORD` | yes, unless `DATABASE_URL` is set | Password for the bundled Postgres                                               |
| `DATABASE_URL`      | optional                          | A hosted database such as Neon; then you do not need `POSTGRES_PASSWORD`        |
| `SOLANA_RPC_URL`    | optional                          | A devnet RPC URL from a provider; empty uses the free public one (rate limited) |

Everything else has a default. Do not create `server/.env` or `app/.env.local`: they are not used.

## Files

| File                                     | Purpose                                                               |
| ---------------------------------------- | --------------------------------------------------------------------- |
| [`app/Dockerfile`](app/Dockerfile)       | The website: builds with Vite, runs `app/serve.ts` on Bun (port 3000) |
| [`server/Dockerfile`](server/Dockerfile) | The API on Bun (port 3001)                                            |
| [`Caddyfile`](Caddyfile)                 | `/api/*` to `server` (prefix removed), everything else to `app`       |
| [`compose.yaml`](compose.yaml)           | Runs the four services. Only Caddy publishes ports (80 and 443)       |
| [`.env.example`](.env.example)           | The one settings file, explained                                      |

Both images are built with the **repo root** as the build context, because the Bun lockfile lives there.

## Deploy on AWS EC2

1. **Launch an instance.** Ubuntu 24.04 LTS, `t3.small` (2 GB RAM) or larger, 20 GB disk. Building the images needs memory: on a `t3.small`, add 2 GB of swap (`sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`). A small instance costs roughly 15 to 20 USD a month; check the AWS pricing page for your region.
2. **Network.** Allocate an **Elastic IP** and attach it, so the address survives restarts. In the security group allow inbound **TCP 80, TCP 443 and UDP 443** from anywhere. Do not open 3000, 3001 or 5432. For SSH, either allow port 22 only from your own IP, or use AWS Systems Manager Session Manager and open no SSH port at all.
3. **DNS.** Create an `A` record for your domain pointing at the Elastic IP.
4. **Install Docker.** Follow Docker's Ubuntu instructions for Docker Engine and the Compose plugin, then `sudo usermod -aG docker $USER` and log in again.
5. **Get the code and settings.**
   ```bash
   git clone https://github.com/GeorgeShani/Solana-Course-Project.git
   cd Solana-Course-Project
   cp .env.example .env
   nano .env        # set NETWORK=devnet, DOMAIN, POSTGRES_PASSWORD (or DATABASE_URL)
   ```
6. **Start.** `docker compose up -d --build`. Caddy gets an HTTPS certificate on the first request to your domain.
7. **Check.** `https://<domain>/` shows the website, `https://<domain>/api/health` returns `{"ok":true}`, and `docker compose ps` shows every service healthy.
8. **Update later.** `git pull && docker compose up -d --build`.

Logs are limited to 10 MB times 5 files per service, so a small disk does not fill up. Use `docker compose logs --tail=100 server` to read them.

### Backups

If you use the bundled Postgres, the data lives in the `pg_data` Docker volume. Take a copy regularly, for example from a daily cron job:

```bash
docker compose exec -T postgres pg_dump -U relay relay | gzip > ~/relay-$(date +%F).sql.gz
```

Copy the file off the server (to S3, for example). If you use a hosted database, its own backups apply.

## Deploying the Solana program (devnet)

The program is deployed once from your computer, not from the server. The full steps are in [docs/DEVNET_RELEASE.md](docs/DEVNET_RELEASE.md). In short: `bun run program:build`, deploy to devnet with your own keypair (devnet SOL is free from `solana airdrop`), then `bun run sync-idl` and rebuild the app.

## Things to know

1. **`NETWORK` and `VITE_*` values are baked into the website at build time.** Changing `NETWORK` means `docker compose up -d --build`.
2. **Only `NETWORK` and `VITE_*` reach the browser.** The database URL, the RPC key and the Jupiter key never do.
3. **Healthchecks.** `server` is checked on `GET /health`. `app` is checked on the static `/favicon.svg`, on purpose: checking `/` would call Solana on every probe. Caddy starts only once both are healthy, so if a healthcheck fails nothing listens on 80/443 and the browser says "connection refused". Healthchecks use `127.0.0.1`, because Bun listens on IPv4 only.
4. **The server refuses unsafe settings** when `NODE_ENV=production` (which the images set): `NETWORK=localnet`, a missing `DATABASE_URL`, an `APP_ORIGIN` without https, or `DEMO_MODE` on. It also refuses to start if `SOLANA_RPC_URL` is not a devnet RPC.
5. **Local test of the whole stack.** With `DOMAIN=localhost`, Caddy serves a locally issued certificate (your browser warns unless you trust Caddy's local CA).

## Status

Not yet run on a machine with Docker and a real domain. Checked so far: `docker compose config` accepts `compose.yaml`; the Caddyfile routes `/api/health` to the API and `/` to the website in a local run; the server and website start from their built output.

Still to do on a real instance: `docker compose up --build`, open the site and `/api/health`, and confirm `docker compose ps` shows everything healthy.

## Troubleshooting

If the browser says "connection refused":

```bash
docker compose ps -a          # is every service running and healthy?
docker compose logs --tail=50 # why not?
```

- `app` or `server` **unhealthy**: Caddy waits for them and never starts. Read that service's logs.
- `server` exits at start with "Production configuration": it lists every problem at once. Fix `.env`.
- `server` exits with "not a devnet RPC": `SOLANA_RPC_URL` points at another network. Use a devnet URL, or empty it.
- **Build failed or killed**: usually out of memory. Add swap (step 1) or use a bigger instance.
- Only Caddy publishes ports. `http://localhost:3000` and `:3001` are intentionally not reachable from the host; use `https://<domain>/` and `https://<domain>/api/health`.
