# program

The Relay on-chain program (Rust + [Anchor](https://www.anchor-lang.com)). It is the authority for **Relay-native plans**: immutable, versioned plan terms and the follow receipts. It is a separate, optional capability; public-source discovery (profiles, ideas, timelines) is off-chain and never touches it.

## Program

`relay` (program ID `Dzm5tgMCdhJZfXeHYuALst4hvZYiCebfyKf1ctx6WBF6`, in `declare_id!` and `Anchor.toml`). Instructions:

| Instruction     | Who signs | What it does                                                                                                     |
| --------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `create_plan`   | creator   | Commits plan version 1: a hash of the terms, and the offchain text's content hash.                               |
| `revise_plan`   | creator   | Appends a new version (hash-chained, never edits an older one; at most 16 versions).                             |
| `close_plan`    | creator   | Closes a plan to new follows.                                                                                    |
| `begin_follow`  | follower  | Starts a follow: records the follower's balances before the swap. Top-level only, never through CPI.             |
| `finish_follow` | follower  | Measures the balance change after exactly one swap by the follower, checks the plan's range, writes the receipt. |

A receipt can only exist if a real in-range swap happened in the same transaction. Pairs and swap programs are fixed at build time in `programs/relay/src/constants.rs` (the only place addresses live).

## Layout

```
program/
├── Anchor.toml
├── Cargo.toml                    Rust workspace
└── programs/
    ├── relay/                    the program (src/, tests/ with LiteSVM)
    ├── simulated_venue/          devnet swap venue: a small pool program; no authority over Relay
    ├── mock_swap/                TEST ONLY: fake venue loaded at Jupiter's address in LiteSVM tests
    └── cpi_attacker/             TEST ONLY: proves relay refuses to be driven through CPI
```

Two builds of `relay` exist:

- **default** (local test fork): mainnet mints and Jupiter's program, used by automated tests only. Relay itself runs on **devnet only**; there is no mainnet in this project.
- **`--features devnet`**: devnet USDC and the simulated swap venue (`simulated_venue`), because Jupiter has no devnet market. `bun run program:build:devnet`.

## Commands

The only part of the repo that must run in WSL. From a Windows terminal at the repo root the `program:*` scripts call into WSL for you:

```bash
bun run program:build          # anchor build (default build)
bun run program:build:devnet   # anchor build -- --features devnet
bun run program:test           # builds the helper programs, then cargo test (default and devnet features)
bun run program:deploy         # anchor deploy (the owner does this, with the owner's keypair)
bun run sync-idl               # copy the IDL into domain/src/solana/relay.idl.json
```

The deployment steps and the internal program review are in [../docs/runbooks/DEVNET_RELEASE.md](../docs/runbooks/DEVNET_RELEASE.md). That review is not an audit.

## Program ID and keys

- `target/` is git-ignored: **back up the program keypair** (`target/deploy/relay-keypair.json`) if you deploy anywhere that matters. Losing it means you can no longer upgrade the program.
- `bun run scripts/set-program-id.ts <address>` rewrites `declare_id!` and `Anchor.toml` (text only, it never touches a keypair); run `anchor keys sync` after changing a keypair.
- The agent never asks for, reads or stores a funded key; the owner deploys.

## Notes for this repo's setup

- **Path with spaces.** If `cargo build-sbf` fails because of them, build into a WSL-native directory (`export CARGO_TARGET_DIR=~/.cache/relay-target`; `scripts/anchor.ts` already does this and copies the IDL back to `program/target`).
- **Slow builds.** Compiling on `/mnt/c` is much slower than on the WSL filesystem, especially on the first run.
- **Solana on PATH.** In non-interactive shells: `export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"`.
