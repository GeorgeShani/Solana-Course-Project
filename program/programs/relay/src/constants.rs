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

/// Supported spot assets (Solana mainnet mints; they also exist on a Surfpool mainnet fork).
/// Keep in sync with domain/src/assets.ts.
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
pub const WSOL_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");
pub const JUP_MINT: Pubkey = pubkey!("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN");

/// Allowed (base, quote) pairs. The follower spends the quote token to receive the base token.
pub const SUPPORTED_PAIRS: [(Pubkey, Pubkey); 2] = [(WSOL_MINT, USDC_MINT), (JUP_MINT, USDC_MINT)];

#[constant]
pub const RECEIPT_SEED: &[u8] = b"receipt";

/// Jupiter Aggregator v6 (RouteV2 etc.). The only program whose instruction may sit between
/// `begin_follow` and `finish_follow`. Confirmed in docs/spikes/surfpool-jupiter.md.
pub const JUPITER_PROGRAM_IDS: [Pubkey; 1] =
    [pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4")];

/// Classic SPL Associated Token Account program (used to derive the follower's canonical accounts).
pub const ATA_PROGRAM_ID: Pubkey = pubkey!("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
