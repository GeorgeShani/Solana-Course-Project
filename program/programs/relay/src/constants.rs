use anchor_lang::prelude::*;

#[constant]
pub const PLAN_SEED: &[u8] = b"plan";
#[constant]
pub const VERSION_SEED: &[u8] = b"version";

/// Domain tag mixed into every terms hash. Bump the suffix if the layout ever changes.
pub const TERMS_TAG: &[u8] = b"relay:plan-version:v1";

/// A plan's entry window must stay open at least this long and at most this long (seconds).
/// Keep in sync with domain/src/plan-terms.ts.
#[constant]
pub const MIN_WINDOW_SECS: i64 = 60;
#[constant]
pub const MAX_WINDOW_SECS: i64 = 7 * 24 * 60 * 60;

/// Maximum versions per plan (v1 plus 15 revisions).
#[constant]
pub const MAX_VERSIONS: u16 = 16;

/// Wrapped SOL: the base token on every network. Keep in sync with domain/src/assets.ts.
pub const WSOL_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");

// The supported pairs and the swap programs are chosen when the program is BUILT, never at run
// time, so a deployed program cannot be pointed at other tokens or another venue.
//
//   default build   the local test fork (a copy of mainnet state): mainnet mints, Jupiter.
//                   Used by the automated tests only.
//   `devnet` build  Solana devnet: the devnet USDC test token, and the simulated swap venue
//                   (program/programs/simulated_venue) instead of Jupiter, which has no devnet
//                   market. Build it with `bun run program:build:devnet`.
//
// Keep these in sync with domain/src/assets.ts and domain/src/solana/venue.ts (tests compare them).

/// USDC on the local test fork (mainnet mint).
#[cfg(not(feature = "devnet"))]
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
#[cfg(not(feature = "devnet"))]
pub const JUP_MINT: Pubkey = pubkey!("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN");

/// Allowed (base, quote) pairs. The follower spends the quote token to receive the base token.
#[cfg(not(feature = "devnet"))]
pub const SUPPORTED_PAIRS: [(Pubkey, Pubkey); 2] = [(WSOL_MINT, USDC_MINT), (JUP_MINT, USDC_MINT)];

/// USDC on Solana devnet (a test token with no value).
#[cfg(feature = "devnet")]
pub const USDC_MINT: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

/// Allowed (base, quote) pairs. The follower spends the quote token to receive the base token.
/// JUP has no devnet mint, so devnet has one pair.
#[cfg(feature = "devnet")]
pub const SUPPORTED_PAIRS: [(Pubkey, Pubkey); 1] = [(WSOL_MINT, USDC_MINT)];

#[constant]
pub const RECEIPT_SEED: &[u8] = b"receipt";

/// Jupiter Aggregator v6 (RouteV2 etc.), the swap program on the local test fork. Confirmed in
/// docs/spikes/surfpool-jupiter.md.
pub const JUPITER_PROGRAM_IDS: [Pubkey; 1] =
    [pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4")];

/// The simulated swap venue (program/programs/simulated_venue). This is a PLACEHOLDER address until
/// the owner deploys the venue with their own keypair; `scripts/set-program-id.ts <relay> --venue
/// <venue>` rewrites it (and the TypeScript copy in domain/src/solana/venue.ts).
pub const VENUE_PROGRAM_ID: Pubkey = pubkey!("3A7tcXdJPRbBTJXvaLpn6vqddkJT8NQG8cgsubYgEmXa");

/// The only programs whose instruction may sit between `begin_follow` and `finish_follow`.
#[cfg(not(feature = "devnet"))]
pub const SWAP_PROGRAM_IDS: [Pubkey; 1] = JUPITER_PROGRAM_IDS;
#[cfg(feature = "devnet")]
pub const SWAP_PROGRAM_IDS: [Pubkey; 1] = [VENUE_PROGRAM_ID];

/// Classic SPL Associated Token Account program (used to derive the follower's canonical accounts).
pub const ATA_PROGRAM_ID: Pubkey = pubkey!("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
