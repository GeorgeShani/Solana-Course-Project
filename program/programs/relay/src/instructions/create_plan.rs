use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::{
    commitment::{compute_terms_hash, TermsInput},
    constants::*,
    error::RelayError,
    events::PlanCommitted,
    state::{Plan, PlanStatus, PlanVersion},
    terms::validate_terms,
};

#[derive(Accounts)]
#[instruction(plan_id: u64)]
pub struct CreatePlan<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + Plan::INIT_SPACE,
        seeds = [PLAN_SEED, creator.key().as_ref(), &plan_id.to_le_bytes()],
        bump
    )]
    pub plan: Account<'info, Plan>,
    #[account(
        init,
        payer = creator,
        space = 8 + PlanVersion::INIT_SPACE,
        seeds = [VERSION_SEED, plan.key().as_ref(), &1u16.to_le_bytes()],
        bump
    )]
    pub version: Account<'info, PlanVersion>,
    /// Must be owned by the classic SPL Token program (Token-2022 mints are rejected by type).
    pub base_mint: Account<'info, Mint>,
    pub quote_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

pub fn handle_create_plan(
    ctx: Context<CreatePlan>,
    plan_id: u64,
    entry_low: u64,
    entry_high: u64,
    expires_at: i64,
    content_hash: [u8; 32],
) -> Result<()> {
    let base = ctx.accounts.base_mint.key();
    let quote = ctx.accounts.quote_mint.key();
    require!(
        SUPPORTED_PAIRS
            .iter()
            .any(|(b, q)| *b == base && *q == quote),
        RelayError::PairNotSupported
    );

    let clock = Clock::get()?;
    validate_terms(entry_low, entry_high, expires_at, clock.unix_timestamp)?;

    let plan_key = ctx.accounts.plan.key();
    let creator = ctx.accounts.creator.key();
    let base_decimals = ctx.accounts.base_mint.decimals;
    let quote_decimals = ctx.accounts.quote_mint.decimals;
    let terms_hash = compute_terms_hash(&TermsInput {
        program_id: crate::ID,
        plan: plan_key,
        version: 1,
        creator,
        base_mint: base,
        quote_mint: quote,
        base_decimals,
        quote_decimals,
        entry_low,
        entry_high,
        expires_at,
        content_hash,
        prev_terms_hash: [0u8; 32],
    });

    let plan = &mut ctx.accounts.plan;
    plan.creator = creator;
    plan.plan_id = plan_id;
    plan.base_mint = base;
    plan.quote_mint = quote;
    plan.base_decimals = base_decimals;
    plan.quote_decimals = quote_decimals;
    plan.latest_version = 1;
    plan.status = PlanStatus::Open;
    plan.created_at = clock.unix_timestamp;
    plan.bump = ctx.bumps.plan;

    let version = &mut ctx.accounts.version;
    version.plan = plan_key;
    version.version = 1;
    version.entry_low = entry_low;
    version.entry_high = entry_high;
    version.expires_at = expires_at;
    version.published_at = clock.unix_timestamp;
    version.published_slot = clock.slot;
    version.content_hash = content_hash;
    version.prev_terms_hash = [0u8; 32];
    version.terms_hash = terms_hash;
    version.bump = ctx.bumps.version;

    emit!(PlanCommitted {
        plan: plan_key,
        creator,
        version: 1,
        terms_hash,
        expires_at
    });
    Ok(())
}
