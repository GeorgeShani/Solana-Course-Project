pub mod commitment;
pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod layout;
pub mod state;
pub mod terms;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("Dzm5tgMCdhJZfXeHYuALst4hvZYiCebfyKf1ctx6WBF6");

#[program]
pub mod relay {
    use super::*;

    pub fn create_plan(
        ctx: Context<CreatePlan>,
        plan_id: u64,
        entry_low: u64,
        entry_high: u64,
        expires_at: i64,
        content_hash: [u8; 32],
    ) -> Result<()> {
        instructions::create_plan::handle_create_plan(
            ctx,
            plan_id,
            entry_low,
            entry_high,
            expires_at,
            content_hash,
        )
    }

    pub fn revise_plan(
        ctx: Context<RevisePlan>,
        entry_low: u64,
        entry_high: u64,
        expires_at: i64,
        content_hash: [u8; 32],
    ) -> Result<()> {
        instructions::revise_plan::handle_revise_plan(
            ctx,
            entry_low,
            entry_high,
            expires_at,
            content_hash,
        )
    }

    pub fn close_plan(ctx: Context<ClosePlan>) -> Result<()> {
        instructions::close_plan::handle_close_plan(ctx)
    }

    /// Snapshot the follower's balances. Valid only as: begin_follow, one Jupiter swap, finish_follow.
    pub fn begin_follow(
        ctx: Context<BeginFollow>,
        version: u16,
        nonce: u64,
        max_quote_in: u64,
    ) -> Result<()> {
        instructions::begin_follow::handle_begin_follow(ctx, version, nonce, max_quote_in)
    }

    /// Measure what the swap did and record a receipt, or revert everything.
    pub fn finish_follow(ctx: Context<FinishFollow>) -> Result<()> {
        instructions::finish_follow::handle_finish_follow(ctx)
    }
}
