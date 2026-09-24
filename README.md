# Solana Legacy Vault

A Solana-based emergency and digital inheritance system. A user creates a vault, names beneficiaries and guardians, sets an inactivity rule, and checks in periodically. If check-ins stop and the guardians agree, a Solana program distributes the vault's assets according to the rules the user set in advance.

Built for the Colosseum Hackathon. Status: **project skeleton only**. The program still contains Anchor's template counter, and no vault logic exists yet.

## Project structure

```
.
├── app/       React + Vite + TypeScript frontend (bun)
├── program/   Rust + Anchor Solana program: the source of truth for vault rules
├── server/    Optional Hono + Bun support backend (reminders, indexing). Never custody.
├── docs/      Product plan and idea validation
├── scripts/   Cross-platform helpers: anchor.ts (runs anchor via WSL), sync-idl.ts
└── package.json   bun workspaces (app, server) and root scripts
```

| Folder | What it is | Docs |
|---|---|---|
| [`app/`](app) | The user-facing interface: wallet connection, vault creation, check-ins, recovery status. | [app/README.md](app/README.md) |
| [`program/`](program) | The on-chain program (`legacy_vault`). Enforces ownership, timers, guardian approvals, and asset movement. | [program/README.md](program/README.md) |
| [`server/`](server) | Optional helper for reminders and read models. Cannot sign or move funds. | [server/README.md](server/README.md) |
| [`docs/`](docs) | [Product plan](docs/product-plan.md) and [idea validation](docs/idea-validation.md). | [docs/README.md](docs/README.md) |

`program/` is a standalone Anchor workspace and is deliberately **not** part of the bun workspaces.

## How the parts fit together

```
 user ──> app (React) ──builds tx──> wallet ──signs──> Solana RPC ──> legacy_vault program
                ^                                                            |
                └──────────────── reads vault state ─────────────────────────┘

 server (Hono) ── reminders / indexing only; no keys, no signing, no custody
```

- The **frontend** is the interface.
- The **wallet** is the signer.
- The **program** is the authority over rules and assets.
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
| `dev:app` | Start the Vite dev server. |
| `dev:server` | Start the Hono server with hot reload. |
| `build:app` | Type-check and build the frontend. |
| `sync-idl` | Copy the program's IDL and TS types from `program/target` into `app/src/idl`. |
| `program:build` | `anchor build` (via WSL on Windows). |
| `program:test` | `anchor test` (via WSL on Windows). |
| `program:deploy` | `anchor deploy` (via WSL on Windows). |

## Next steps

Before building features, finish the validation tasks in [docs/idea-validation.md](docs/idea-validation.md). The first technical spike is proving that a vault PDA can move delegated SPL tokens to a beneficiary.
