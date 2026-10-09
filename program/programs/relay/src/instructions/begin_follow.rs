use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::{
    constants::*,
    error::RelayError,
    layout::{ata_address, require_top_level, verify_follow_layout, FollowAccounts},
    state::{FollowReceipt, Plan, PlanStatus, PlanVersion, ReceiptStatus},
};

/// First half of a follow: validates the plan version and snapshots the follower's balances.
/// Only valid inside the exact layout enforced by `layout::verify_follow_layout`.
#[derive(Accounts)]
#[instruction(version: u16, nonce: u64)]
pub struct BeginFollow<'info> {
    #[account(mut)]
    pub follower: Signer<'info>,
    pub plan: Account<'info, Plan>,
    #[account(
        seeds = [VERSION_SEED, plan.key().as_ref(), &version.to_le_bytes()],
        bump = plan_version.bump,
        constraint = plan_version.plan == plan.key() @ RelayError::StaleVersion,
    )]
    pub plan_version: Account<'info, PlanVersion>,
    #[account(
        init,
        payer = follower,
        space = 8 + FollowReceipt::INIT_SPACE,
        seeds = [RECEIPT_SEED, plan_version.key().as_ref(), follower.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub receipt: Account<'info, FollowReceipt>,
    #[account(
        address = ata_address(&follower.key(), &plan.base_mint) @ RelayError::TokenAccountMismatch
    )]
    pub follower_base: Account<'info, TokenAccount>,
    #[account(
        address = ata_address(&follower.key(), &plan.quote_mint) @ RelayError::TokenAccountMismatch
    )]
    pub follower_quote: Account<'info, TokenAccount>,
    /// CHECK: the instructions sysvar, address-checked.
    #[account(address = solana_instructions_sysvar::ID)]
    pub instructions: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_begin_follow(
    ctx: Context<BeginFollow>,
    version: u16,
    nonce: u64,
    max_quote_in: u64,
) -> Result<()> {
    require_top_level()?;

    let plan = &ctx.accounts.plan;
    let plan_version = &ctx.accounts.plan_version;
    require!(plan.status == PlanStatus::Open, RelayError::PlanClosed);
    // A review done against an older version must fail, never silently follow the new one.
    require!(version == plan.latest_version, RelayError::StaleVersion);
    require!(max_quote_in > 0, RelayError::InvalidAmount);

    let now = Clock::get()?.unix_timestamp;
    require!(
        now >= plan_version.published_at,
        RelayError::PlanNotYetActive
    );
    require!(now < plan_version.expires_at, RelayError::PlanExpired);

    verify_follow_layout(
        &ctx.accounts.instructions.to_account_info(),
        &FollowAccounts {
            receipt: &ctx.accounts.receipt.key(),
            follower: &ctx.accounts.follower.key(),
            follower_base: &ctx.accounts.follower_base.key(),
            follower_quote: &ctx.accounts.follower_quote.key(),
        },
    )?;

    let receipt = &mut ctx.accounts.receipt;
    receipt.plan = plan.key();
    receipt.version = version;
    receipt.follower = ctx.accounts.follower.key();
    receipt.pre_base = ctx.accounts.follower_base.amount;
    receipt.pre_quote = ctx.accounts.follower_quote.amount;
    receipt.max_quote_in = max_quote_in;
    receipt.quote_spent = 0;
    receipt.base_received = 0;
    receipt.status = ReceiptStatus::Pending;
    receipt.recorded_at = 0;
    receipt.slot = 0;
    receipt.nonce = nonce;
    receipt.bump = ctx.bumps.receipt;
    Ok(())
}
