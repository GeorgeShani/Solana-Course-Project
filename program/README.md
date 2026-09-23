# program

The on-chain half of Solana Legacy Vault: a Rust + [Anchor](https://www.anchor-lang.com) program named `legacy_vault`. It is the source of truth for vault rules, timers, guardian approvals, and asset movement.

## Current state

Anchor's default template: a `counter` account with `initialize` and `increment` instructions. It exists only to prove the toolchain and the frontend path. Real vault instructions come after idea validation (see [../docs/idea-validation.md](../docs/idea-validation.md)).

## Layout

```
program/
├── Anchor.toml                  cluster, wallet, program IDs
├── Cargo.toml                   Rust workspace
└── programs/legacy_vault/
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

The ID is declared in `programs/legacy_vault/src/lib.rs` (`declare_id!`) and in `Anchor.toml`. It matches the keypair at `target/deploy/legacy_vault-keypair.json`.

- `target/` is git-ignored, so **back that keypair up** if you deploy anywhere that matters. Losing it means you can no longer upgrade the deployed program.
- After changing or regenerating the keypair, run `anchor keys sync`.

## IDL and types

`anchor build` writes:

- `target/idl/legacy_vault.json`: the IDL
- `target/types/legacy_vault.ts`: TypeScript types

Copy both into the frontend with `bun run sync-idl` from the repo root.

## Notes for this repo's setup

- **Path with spaces.** The repository path contains spaces. If `cargo build-sbf` fails because of them, keep the source where it is and build into a WSL-native directory: `export CARGO_TARGET_DIR=~/.cache/legacy_vault-target`, then copy the IDL and types back from there.
- **Slow builds.** Compiling on `/mnt/c` is much slower than on the WSL filesystem, especially on the first run.
- **Solana on PATH.** In non-interactive shells: `export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"`.
