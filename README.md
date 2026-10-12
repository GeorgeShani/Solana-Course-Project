# Relay

**See the original idea. Follow what changed. Check the evidence.**

Relay is a public-source trading-idea memory system. It turns traders' public ideas into followable timelines: the original source, later updates and the evidence that is available. Native Solana plans (signed terms, user-approved execution, inspectable receipts) are an optional, separate capability.

Start with [PRODUCT.md](PRODUCT.md) (what Relay is and is not) and [docs/ROADMAP.md](docs/ROADMAP.md) (what is being built now).

## Repository map

| Folder                | What it is                                                                                                                | Docs                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [`app/`](app)         | TanStack Start (React, SSR) frontend: Discover, profiles, idea timelines, Updates, Watchlist, Plans, Account.             | [app/README.md](app/README.md)         |
| [`server/`](server)   | Hono + Bun + Postgres. Serves discovery (manual curation) and mirrors the chain for plans. Never an authority.            | [server/README.md](server/README.md)   |
| [`domain/`](domain)   | `@relay/domain`: integer money math, hashes, entry status and the `@solana/kit` program client. Shared by app and server. |                                        |
| [`program/`](program) | Rust + Anchor program `relay`, plus test-only `mock_swap`, `cpi_attacker` and the devnet `simulated_venue`.               | [program/README.md](program/README.md) |
| [`scripts/`](scripts) | `anchor.ts` (runs Anchor through WSL on Windows), `sync-idl.ts`, `set-program-id.ts`.                                     |                                        |
| [`docs/`](docs)       | Roadmap, runbooks, research, archived history.                                                                            | [docs/README.md](docs/README.md)       |

## Two domains, never merged

- **Discovery (primary).** Public-source editorial records: profiles, sources, ideas and timeline events, loaded from `server/curation/curated.json` and served under `/discovery`. They show what an attributed public source said and when. They do not prove that anyone traded, owns a wallet or profited. See [server/curation/README.md](server/curation/README.md).
- **Native plans (optional).** Plans signed on Solana devnet, mirrored by the server. Chain data is authoritative. Lives under Plans.

Fictional fixtures (`/demo`, and the development-only `/dev/plan-states`) are labelled and isolated from both.

## Prerequisites

Developed on Windows with the Solana toolchain in WSL.

| Part                         | Where it runs    | Needs                                            |
| ---------------------------- | ---------------- | ------------------------------------------------ |
| `app/`, `server/`, `domain/` | Windows (native) | [Bun](https://bun.sh), Docker (local Postgres)   |
| `program/`                   | WSL (Ubuntu)     | Rust, Solana CLI (Agave) 3.1.x, Anchor CLI 1.1.x |

Run `bun install` on Windows only; installing from WSL puts Linux-only binaries in `node_modules`.

## Quick start (discovery)

From the repo root. All settings live in one root `.env` (copy `.env.example`).

```bash
bun install
docker compose -f compose.dev.yaml up -d      # Postgres on 127.0.0.1:5432
bun run --cwd server curate --check           # validate server/curation/curated.json
bun run dev:server                            # migrates, then serves :3001
bun run --cwd server curate                   # load the curated profiles into the dev database
bun run dev:app                               # http://localhost:5173
```

Native plans additionally need a deployed program and a funded creator; see [docs/runbooks/DEVNET_RELEASE.md](docs/runbooks/DEVNET_RELEASE.md).

## Commands

| Command                                                | What it does                                              |
| ------------------------------------------------------ | --------------------------------------------------------- |
| `bun run lint`                                         | oxlint, including the no-type-assertions rule             |
| `(cd domain && bun test && bunx tsc -p tsconfig.json)` | Domain tests and types                                    |
| `(cd server && bun test && bunx tsc -p tsconfig.json)` | Server tests (needs the dev Postgres and `relay_test`)    |
| `(cd app && bun test && bunx tsc -b)`                  | App tests and types                                       |
| `bun run build:app`                                    | Production build of the frontend                          |
| `bun run program:build` / `program:build:devnet`       | `anchor build` in WSL (default fork build / devnet build) |
| `bun run program:test`                                 | Rust tests (LiteSVM)                                      |
| `bun run sync-idl`                                     | Copy the IDL into `domain/src/solana/relay.idl.json`      |

## Deployment

Docker Compose behind Caddy on one host: see [DEPLOYMENT.md](DEPLOYMENT.md). The program is deployed from the owner's computer with the owner's keypair; the agent never holds a funded key.

## Rules that always apply

Devnet only. No `@solana/web3.js`, no Anchor TypeScript client, no type assertions in TypeScript, money is integers, a failed transaction stays failed, nothing from the client is trusted for amounts or outcomes, and no traders, posts or identities are invented. The full list is in [AGENTS.md](AGENTS.md).
