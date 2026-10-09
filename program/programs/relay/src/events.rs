use anchor_lang::prelude::*;

/// Events are hints for indexers. Logs can be truncated, so indexers must read accounts as truth.
#[event]
pub struct PlanCommitted {
    pub plan: Pubkey,
    pub creator: Pubkey,
    pub version: u16,
    pub terms_hash: [u8; 32],
    pub expires_at: i64,
}

#[event]
pub struct PlanRevised {
    pub plan: Pubkey,
    pub creator: Pubkey,
    pub version: u16,
    pub terms_hash: [u8; 32],
    pub expires_at: i64,
}

#[event]
pub struct PlanClosedEvent {
    pub plan: Pubkey,
    pub creator: Pubkey,
}
