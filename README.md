# Solana Course Project

A Solana project with a server-rendered React frontend (TanStack Start), a Rust + Anchor on-chain program, and an optional Hono/Bun support server.

Status: **project skeleton only, idea still open.** The program contains Anchor's template counter, and the app is a wallet smoke test. Candidate ideas live in [docs/ideas](docs/ideas/README.md); none is built yet.

## Project structure

```
.
├── app/       React + TanStack Start (SSR) + TypeScript frontend (bun)
├── program/   Rust + Anchor Solana program: the source of truth for rules and assets
├── server/    Optional Hono + Bun support backend (reminders, indexing). Never custody.
├── docs/      Candidate project ideas (docs/ideas/)
├── scripts/   Cross-platform helpers: anchor.ts (runs anchor via WSL), sync-idl.ts
└── package.json   bun workspaces (app, server) and root scripts
```

| Folder | What it is | Docs |
|---|---|---|
| [`app/`](app) | The user-facing interface: wallet connection and calls to the program. | [app/README.md](app/README.md) |
| [`program/`](program) | The on-chain program (`course_program`, a placeholder name). The source of truth for rules and asset movement. | [program/README.md](program/README.md) |
| [`server/`](server) | Optional helper for reminders, indexing, and caching. Cannot sign or move funds. | [server/README.md](server/README.md) |
| [`docs/`](docs) | Candidate project [ideas](docs/ideas/README.md), one folder each. | [docs/README.md](docs/README.md) |

`program/` is a standalone Anchor workspace and is deliberately **not** part of the bun workspaces.

## How the parts fit together

```
 user ──> app (React) ──builds tx──> wallet ──signs──> Solana RPC ──> course_program program
                ^                                                            |
                └──────────────── reads on-chain state ─────────────────────────┘

 server (Hono) ── reminders / indexing only; no keys, no signing, no custody
```

- The **frontend** is the interface.
- The **wallet** is the signer.
- The **program** is the authority over rules and assets (once there are any).
- The **server** is optional and can only help; the app works without it.

## Prerequisites

The repo is developed on Windows, with the Solana toolchain in WSL:

| Part | Where it runs | Needs |
|---|---|---|
| `app/`, `server/`, root scripts | **Windows** (native) | [Bun](https://bun.sh) |
| `program/` | **WSL (Ubuntu)** | Rust (rustup), Solana CLI (Agave) 3.1.x, Anchor CLI 1.1.x |

You also need a Solana wallet browser extension (Phantom, Solflare, Backpack).

Anchor and Solana don't run natively on Windows. The `program:*` root scripts call into WSL for you (see `scripts/anchor.ts`), so you can run everything from a Windows terminal at the repo root. The files stay on the Windows filesystem and WSL reads them at `/mnt/c/...`.

Installing JS dependencies from WSL would put Linux-only binaries into `node_modules` that Windows can't run, so run `bun install` on Windows only.

## Quick start

Run from the repo root in a Windows terminal.

```bash
# 1. Install JS dependencies for app and server
bun install

# 2. Build the program and test it (runs in WSL)
bun run program:build
bun run program:test

# 3. Copy the generated IDL and types into the frontend
bun run sync-idl

# 4. Run the app (and, optionally, the server)
bun run dev:app       # http://localhost:5173
bun run dev:server    # http://localhost:3001
```

To use the app against a local chain, start a validator inside WSL (`solana-test-validator`), deploy with `bun run program:deploy`, point your wallet at localnet, and fund it with `solana airdrop 2 <address>`. See [program/README.md](program/README.md).

## Root scripts

| Script | What it does |
|---|---|
| `dev:app` | Start the Vite dev server (SSR). |
| `dev:server` | Start the Hono server with hot reload. |
| `build:app` | Build the frontend (client + SSR bundle) and type-check. |
| `sync-idl` | Copy the program's IDL and TS types from `program/target` into `app/src/idl`. |
| `program:build` | `anchor build` (via WSL on Windows). |
| `program:test` | `anchor test` (via WSL on Windows). |
| `program:deploy` | `anchor deploy` (via WSL on Windows). |

## Next steps

1. Pick an idea from [docs/ideas](docs/ideas/README.md) (or add one) and validate it.
2. Rename the placeholder program and replace the template counter. See "Choosing an idea" in [docs/ideas/README.md](docs/ideas/README.md).
