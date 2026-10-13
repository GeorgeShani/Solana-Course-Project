# Go live: start Docker Compose and point a domain at the server

The short path from "I have a server" to "Relay answers at my domain". For the full reasoning, backups and troubleshooting, see [DEPLOYMENT.md](../../DEPLOYMENT.md).

You need: an Ubuntu server with a public IPv4 address (an AWS EC2 instance with an **Elastic IP**), a domain you control, and this repository on the server.

## 1. Add the DNS record (domain to IP)

DNS is what turns `relay.example.com` into your server's address. Do this **first**: Caddy can only get an HTTPS certificate once the name already points at the server.

1. **Find the server's public IPv4 address.** On AWS: EC2 → Elastic IPs → _Allocate Elastic IP address_, then _Associate_ it with your instance. Use the Elastic IP, not the instance's auto-assigned one, which changes when the instance restarts. On the server, `curl -4 ifconfig.me` prints the address it is reached on.
2. **Open your DNS provider's records page.** That is wherever the domain's nameservers point: the registrar's own DNS panel (Namecheap, GoDaddy, Google/Squarespace Domains, Porkbun, ...), Cloudflare, or **Route 53**.
3. **Create an `A` record:**

   | Field          | Value                                                                                     |
   | -------------- | ----------------------------------------------------------------------------------------- |
   | Type           | `A`                                                                                       |
   | Name / Host    | `@` for the bare domain (`example.com`), or `relay` for a subdomain (`relay.example.com`) |
   | Value / Points | your server's IPv4 address, for example `203.0.113.10`                                    |
   | TTL            | `300` (5 minutes) while setting up; it can be raised later                                |
   - **Route 53:** Hosted zones → your domain → _Create record_ → Record type `A`, leave the name blank for the bare domain or type the subdomain, value = the IP, TTL 300.
   - **Cloudflare:** set the record's proxy to **DNS only** (grey cloud) for now. The orange proxy changes how certificates are issued and hides problems.
   - Use an `A` record, not a `CNAME`: a CNAME points at another _name_, never at an IP. Do not add an `AAAA` record unless the server really has IPv6.
   - **`www`:** add a second record, a `CNAME` with name `www` and value `example.com` (your bare domain). Relay serves one address (the one in `DOMAIN`, which the server's allowed origin and Google sign-in are set up for), so Caddy answers `www.example.com` with a permanent redirect to it, keeping the path and query. Caddy needs its own certificate for the `www` name, so the record has to exist and resolve, and port 80 has to be open. Without it, `https://www.example.com` shows a certificate error while the main address works.

4. **Check that it resolves** (from your own computer; it can take from a minute to a few hours to spread, usually minutes with TTL 300):

   ```bash
   nslookup relay.example.com
   # or: dig +short relay.example.com        -> must print your server's IP
   dig +short www.relay.example.com          # -> prints relay.example.com and then the same IP
   ```

   If it prints an old or no address, wait and try again; do not start Caddy against a name that does not resolve yet.

5. **Open the firewall.** In the instance's security group allow inbound **TCP 80, TCP 443 and UDP 443** from anywhere. Port **80 must be open**: Let's Encrypt proves you own the domain over it. Do not open 3000, 3001 or 5432.

## 2. Set the one settings file

On the server, in the repository folder:

```bash
cp .env.example .env
nano .env
```

Set at least these (see `.env.example` for the rest):

```bash
NETWORK=devnet
DOMAIN=relay.example.com          # a bare host name: no https://, no trailing slash
POSTGRES_PASSWORD=choose-a-long-random-password   # or set DATABASE_URL instead (for example Neon)
# For Google sign-in, which following a plan needs:
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://relay.example.com/api/auth/google/callback
```

The same redirect URI must be listed as an authorised redirect URI on the OAuth client in Google Cloud Console. `.env` is private and git-ignored: never commit it or paste it in chat.

## 3. Start Docker Compose

Install Docker Engine and the Compose plugin first (Docker's own Ubuntu instructions), then `sudo usermod -aG docker $USER` and log in again.

**With the bundled Postgres** (the default; data lives in the `pg_data` volume):

```bash
docker compose up -d --build
```

**With a hosted database such as Neon** (`DATABASE_URL` set in `.env`; do not start the bundled Postgres):

```bash
docker compose up -d --build --no-deps app server caddy
```

Keep `--no-deps`: without it Compose still starts `postgres` as a dependency.

The first build takes several minutes. On a 2 GB instance add swap first, or the build may be killed:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
```

## 4. Check it

```bash
docker compose ps                                  # every service Up, app and server (healthy)
curl -s https://relay.example.com/api/health       # {"ok":true}
curl -s https://relay.example.com/api/health/ready # database and rpc both "ok"
```

`curl -sI https://www.relay.example.com/` should answer `301` with `location: https://relay.example.com/`. Then open `https://relay.example.com/` in a browser. A new database is empty, so load the public-source records once (name the database host: `postgres` for the bundled one, or your Neon host):

```bash
docker compose exec server bun run scripts/curate.ts --confirm-db-host=postgres
```

## 5. Everyday commands

```bash
docker compose logs --tail=100 server    # read the API's logs (also: app, caddy)
docker compose restart server            # restart one service
git pull && docker compose up -d --build # update by hand (add --no-deps app server caddy for a hosted database)
docker compose down                      # stop everything (data volumes are kept)
```

To have the server follow GitHub by itself instead of updating by hand, install the timer: `sudo scripts/install-auto-deploy.sh` (every 5 minutes; see "Automatic deploys" in DEPLOYMENT.md). `NETWORK` and `VITE_*` values are baked into the website at build time, so after changing `.env` rebuild with `scripts/deploy.sh --force` or the `up -d --build` command above.

## If something does not work

| Symptom                                               | Likely cause and fix                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser says "connection refused"                     | A service is unhealthy so Caddy never started: `docker compose ps -a`, then `docker compose logs --tail=50`.                                                                                                                                                                                                                                |
| Browser warns about the certificate                   | The name does not resolve to this server yet, or port 80/443 is closed. Re-check step 1 (`dig +short`) and the security group, then `docker compose restart caddy`.                                                                                                                                                                         |
| `www` shows a certificate error or does not load      | The `www` record is missing or has not spread yet (`dig +short www.<domain>`), or the server is still running an older Caddyfile. Once the record resolves: `git pull`, then `docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile` (the auto-deploy does that reload by itself). Caddy retries the certificate on its own. |
| Site loads but nothing can be saved (403)             | `DOMAIN` has a scheme or a typo, so the server's allowed origin is wrong. Fix `.env`, then `docker compose up -d --build`.                                                                                                                                                                                                                  |
| "Sign in with Google" does nothing or errors          | `GOOGLE_*` unset, or the redirect URI differs from the one in Google Cloud Console by even a character.                                                                                                                                                                                                                                     |
| Server exits at start with "Production configuration" | It lists every problem at once: fix `.env`.                                                                                                                                                                                                                                                                                                 |
| Plans page says Relay can't read Solana               | The RPC is down or rate-limited: set `SOLANA_RPC_URL` to a devnet provider URL and rebuild.                                                                                                                                                                                                                                                 |
