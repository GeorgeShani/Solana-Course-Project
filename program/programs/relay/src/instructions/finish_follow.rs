use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::{
    constants::*,
    error::RelayError,
    events::FollowRecorded,
    layout::{ata_address, require_top_level},
    state::{FollowReceipt, Plan, PlanVersion, ReceiptStatus},
};

/// Second half of a follow: measures what the swap actually did and enforces the plan's range.
/// If any check fails the whole transaction (including the swap) reverts, so a receipt exists
/// only for a swap that happened inside the range. Account order matters: layout.rs reads the
/// follower at index 0 and the receipt at index 1.
#[derive(Accounts)]
pub struct FinishFollow<'info> {
    pub follower: Signer<'info>,
    #[account(
        mut,
        has_one = follower,
        constraint = receipt.plan == plan.key() @ RelayError::InvalidInstructionLayout,
        constraint = receipt.version == plan_version.version @ RelayError::InvalidInstructionLayout,
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
    #[account(
        seeds = [VERSION_SEED, plan.key().as_ref(), &receipt.version.to_le_bytes()],
        bump = plan_version.bump,
    )]
    pub plan_version: Account<'info, PlanVersion>,
    pub plan: Account<'info, Plan>,
}

pub fn handle_finish_follow(ctx: Context<FinishFollow>) -> Result<()> {
    require_top_level()?;

    let receipt = &mut ctx.accounts.receipt;
    require!(
        receipt.status == ReceiptStatus::Pending,
        RelayError::ReceiptNotPending
    );

    // Observed facts, never client-supplied numbers.
    let base_received = ctx
        .accounts
        .follower_base
        .amount
        .checked_sub(receipt.pre_base)
        .ok_or(RelayError::NoOutputReceived)?;
    let quote_spent = receipt
        .pre_quote
        .checked_sub(ctx.accounts.follower_quote.amount)
        .ok_or(RelayError::NoInputSpent)?;
    require!(base_received > 0, RelayError::NoOutputReceived);
    require!(quote_spent > 0, RelayError::NoInputSpent);
    require!(
        quote_spent <= receipt.max_quote_in,
        RelayError::InputAboveMax
    );

    // Price check in u128 with cross-multiplication, so there is no rounding at the boundary:
    //   paid_per_whole_base = quote_spent * 10^base_decimals / base_received
    let plan = &ctx.accounts.plan;
    let version = &ctx.accounts.plan_version;
    let paid = (quote_spent as u128)
        .checked_mul(10u128.pow(plan.base_decimals as u32))
        .ok_or(RelayError::MathOverflow)?;
    let at_high = (version.entry_high as u128)
        .checked_mul(base_received as u128)
        .ok_or(RelayError::MathOverflow)?;
    let at_low = (version.entry_low as u128)
        .checked_mul(base_received as u128)
        .ok_or(RelayError::MathOverflow)?;
    require!(paid <= at_high, RelayError::PriceAboveRange);
    require!(paid >= at_low, RelayError::PriceBelowRange);

    let clock = Clock::get()?;
    receipt.quote_spent = quote_spent;
    receipt.base_received = base_received;
    receipt.status = ReceiptStatus::Recorded;
    receipt.recorded_at = clock.unix_timestamp;
    receipt.slot = clock.slot;

    emit!(FollowRecorded {
        receipt: receipt.key(),
        plan: plan.key(),
        version: receipt.version,
        follower: receipt.follower,
        quote_spent,
        base_received,
    });
    Ok(())
}
