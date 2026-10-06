# program

The on-chain half of the project: a Rust + [Anchor](https://www.anchor-lang.com) program with the placeholder name `course_program`. It is the source of truth for rules and asset movement.

## Current state

Anchor's default template: a `counter` account with `initialize` and `increment` instructions. It exists only to prove the toolchain and the frontend path. Real instructions come once an idea is chosen (see [../docs/ideas](../docs/ideas/README.md)).

## Layout

```
program/
├── Anchor.toml                  cluster, wallet, program IDs
├── Cargo.toml                   Rust workspace
└── programs/course_program/
    ├── src/
    │   ├── lib.rs               program entry, declare_id!, instruction list
    │   ├── instructions/        one file per instruction
    │   ├── state.rs             account structs
    │   ├── constants.rs         seeds and limits
    │   └── error.rs             custom errors
    └── tests/                   Rust tests (LiteSVM)
```

Tests are written in Rust with [LiteSVM](https://github.com/LiteSVM/litesvm), so no JavaScript is needed here. This folder is not part of the bun workspaces.

## Commands

This is the only part of the repo that must run in WSL. From a Windows terminal at the repo root, the `program:*` scripts do that for you:

```bash
bun run program:build     # anchor build: compile, write the IDL and types to target/
bun run program:test      # anchor test: build, then run the Rust tests
bun run program:deploy    # anchor deploy: deploy to the cluster set in Anchor.toml
```

Or, inside WSL in this folder, run `anchor build`, `anchor test` and `anchor deploy` directly.

Local deployment (inside WSL):

```bash
solana-test-validator          # in one terminal
anchor deploy                  # in another
```

For devnet, set `cluster = "devnet"` in `Anchor.toml` (or pass `--provider.cluster devnet`) and fund the wallet with `solana airdrop 2`.

## Program ID

The ID is declared in `programs/course_program/src/lib.rs` (`declare_id!`) and in `Anchor.toml`. It matches the keypair at `target/deploy/course_program-keypair.json`.

- `target/` is git-ignored, so **back that keypair up** if you deploy anywhere that matters. Losing it means you can no longer upgrade the deployed program.
- After changing or regenerating the keypair, run `anchor keys sync`.

## IDL and types

`anchor build` writes:

- `target/idl/course_program.json`: the IDL
- `target/types/course_program.ts`: TypeScript types

Copy both into the frontend with `bun run sync-idl` from the repo root.

## Renaming the program

`course_program` is a placeholder. To rename it, update the folder under `programs/`, `name` in its `Cargo.toml` (both `[package]` and `[lib]`), `Anchor.toml`, `scripts/sync-idl.ts`, and `app/src/lib/program.ts`, then rebuild and run `bun run sync-idl`. A new crate name means a new keypair file in `target/deploy/`; copy the old keypair to the new name to keep the same program ID, or run `anchor keys sync` to adopt a new one.

## Notes for this repo's setup

- **Path with spaces.** The repository path contains spaces. If `cargo build-sbf` fails because of them, keep the source where it is and build into a WSL-native directory: `export CARGO_TARGET_DIR=~/.cache/course_program-target`, then copy the IDL and types back from there.
- **Slow builds.** Compiling on `/mnt/c` is much slower than on the WSL filesystem, especially on the first run.
- **Solana on PATH.** In non-interactive shells: `export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"`.
