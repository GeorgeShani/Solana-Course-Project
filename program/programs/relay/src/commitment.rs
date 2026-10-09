use anchor_lang::prelude::*;
use solana_sha256_hasher::hashv;

use crate::constants::TERMS_TAG;

/// Everything that goes into a version's `terms_hash`, in the exact order and width used by
/// domain/src/commitment.ts. Tests prove both implementations match test-vectors/plan-hash.json.
pub struct TermsInput {
    pub program_id: Pubkey,
    pub plan: Pubkey,
    pub version: u16,
    pub creator: Pubkey,
    pub base_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub base_decimals: u8,
    pub quote_decimals: u8,
    pub entry_low: u64,
    pub entry_high: u64,
    pub expires_at: i64,
    pub content_hash: [u8; 32],
    pub prev_terms_hash: [u8; 32],
}

pub fn compute_terms_hash(t: &TermsInput) -> [u8; 32] {
    hashv(&[
        TERMS_TAG,
        t.program_id.as_ref(),
        t.plan.as_ref(),
        &t.version.to_le_bytes(),
        t.creator.as_ref(),
        t.base_mint.as_ref(),
        t.quote_mint.as_ref(),
        &[t.base_decimals],
        &[t.quote_decimals],
        &t.entry_low.to_le_bytes(),
        &t.entry_high.to_le_bytes(),
        &t.expires_at.to_le_bytes(),
        &t.content_hash,
        &t.prev_terms_hash,
    ])
    .to_bytes()
}
