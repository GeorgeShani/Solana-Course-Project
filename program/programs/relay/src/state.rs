use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum PlanStatus {
    Open,
    Closed,
}

/// A creator's trade plan. Holds only what changes rarely; every version's terms live in a
/// separate immutable `PlanVersion` account. Never closed: it is history.
#[account]
#[derive(InitSpace)]
pub struct Plan {
    pub creator: Pubkey,
    pub plan_id: u64,
    pub base_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub base_decimals: u8,
    pub quote_decimals: u8,
    pub latest_version: u16,
    pub status: PlanStatus,
    pub created_at: i64,
    pub bump: u8,
}

/// One immutable version of a plan. Nothing in this program can write to it after `init`.
/// Prices are u64 quote atomic units per ONE WHOLE base token. Times are unix seconds.
#[account]
#[derive(InitSpace)]
pub struct PlanVersion {
    pub plan: Pubkey,
    pub version: u16,
    pub entry_low: u64,
    pub entry_high: u64,
    pub expires_at: i64,
    pub published_at: i64,
    pub published_slot: u64,
    /// SHA-256 of the offchain text (rationale, exit thesis, ...). See domain/src/commitment.ts.
    pub content_hash: [u8; 32],
    /// terms_hash of the previous version; all zeros for version 1.
    pub prev_terms_hash: [u8; 32],
    /// Hash over all of the above plus the plan, creator and program id (see commitment.rs).
    pub terms_hash: [u8; 32],
    pub bump: u8,
}
