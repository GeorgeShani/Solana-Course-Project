# Relay: instructions for AI agents

## Read this first

Before you plan, edit or run anything, read, in this order:

1. [PRODUCT.md](PRODUCT.md): what Relay is, the evidence taxonomy, the locked decisions.
2. [docs/ROADMAP.md](docs/ROADMAP.md): the active milestones and what is next.
3. The README of the subsystem you touch (`app/`, `server/`, `program/`, `server/curation/`) and [DESIGN.md](DESIGN.md) for UI work.

Authority order when documents disagree: **PRODUCT.md > docs/ROADMAP.md > subsystem READMEs > everything else.** Everything under `docs/archive/` is historical context only and is **not** current product authority; do not rebuild against it. If code and these documents disagree, say so and ask rather than silently picking one.

Work one milestone at a time, in order. When a milestone finishes, update `docs/ROADMAP.md` (status and a short result note).

## What this is

Relay is a public-source trading-idea memory system: "See the original idea. Follow what changed. Check the evidence." It turns traders' public ideas into followable timelines (original source, later updates, available evidence). Trading is secondary. Relay-native plans on Solana are an optional, separate capability under Plans: followers authorize each trade themselves, creator updates never authorize anything, and an eligible entry is never described as safe, recommended or profitable. Public-source discovery and Relay-native execution never share authority.

## Repository map

| Folder     | What it is                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `program/` | Rust + Anchor program (`relay`), plus test-only `mock_swap` and `cpi_attacker`. The authority for rules.                                         |
| `domain/`  | `@relay/domain`: integer money math, hashes, entry status, and the Kit program client in `domain/src/solana`. Shared by app, server and scripts. |
| `server/`  | Hono + Bun + Postgres. Mirrors the chain, serves the feed, verifies follows. Never an authority.                                                 |
| `app/`     | TanStack Start (React) frontend.                                                                                                                 |
| `scripts/` | `anchor.ts` (runs Anchor through WSL), `sync-idl.ts`.                                                                                            |
| `docs/`    | Roadmap, runbooks, research, archived history.                                                                                                   |

## Rules that always apply

- **Stack is fixed:** TanStack Start, Hono, Anchor, Solana, Bun, Postgres, **`@solana/kit`**. Do not use `@solana/web3.js` or the Anchor TypeScript client, and do not restructure folders without a concrete reason.
- **No type assertions.** Never write `as X` or `as unknown as X` in TypeScript. Narrow `unknown` with type guards, `instanceof`, `typeof`/`in`, or runtime validation. `bun run lint` enforces it.
- **Money is integers.** Prices are u64 quote units per whole base token; never use floats in protocol or money paths.
- **Never fake blockchain behaviour.** Anything shown as real must come from the chain. Fictional data must be visibly labelled.
- **Failed stays failed.** A failed transaction is never shown or stored as a participation.
- **Trust nothing from the client** for amounts, prices or outcomes; re-read the chain.
- **Devnet only.** Relay runs on Solana devnet (test tokens, no value); there is no mainnet in this project and none must be added. Never ask for, store or sign with a key that holds real funds; the owner signs. Burner keys only on the local test fork.
- **Never invent traders, posts or identities.** Curated records need an owner-confirmed source; manual coverage is labelled as manual.

## Working conventions

- Format with Prettier defaults (`bunx prettier@3 --write <files>`) and `cargo fmt` for Rust, only for files you create or change.
- Commit **one commit per phase**, on a feature branch (never directly on `main`), using explicit pathspecs (`git commit -- <paths>`). Put formatting-only changes in their own commit. Do not push unless asked.
- Commit messages end with the co-author line given by the session.
- Add real tests, including adversarial ones for program and execution work. A passing suite is not an audit.

## Commands (run from the repo root)

```bash
bun install
bun run lint                                  # includes the no-type-assertions rule
bun run program:build                         # anchor build in WSL (output in ~/.cache/relay-target, copied to program/target)
bun run program:test                          # Rust tests (LiteSVM)
bun run sync-idl                              # IDL -> domain/src/solana/relay.idl.json
(cd domain && bun test && bunx tsc -p tsconfig.json)
(cd server && bun test && bunx tsc -p tsconfig.json)   # needs: docker compose -f compose.dev.yaml up -d
(cd app && bun run build)
```

Fork demos (Surfpool local fork) are described in `docs/spikes/surfpool-jupiter.md` and `server/README.md`. Curation: `bun run --cwd server curate --check`.
