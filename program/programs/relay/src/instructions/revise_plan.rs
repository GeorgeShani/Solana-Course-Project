use anchor_lang::prelude::*;

use crate::{
    commitment::{compute_terms_hash, TermsInput},
    constants::*,
    error::RelayError,
    events::PlanRevised,
    state::{Plan, PlanStatus, PlanVersion},
    terms::validate_terms,
};

/// Appends the next version. The pair cannot change (mints are not arguments), the previous
/// version is read-only, and the new one chains on the previous `terms_hash`.
#[derive(Accounts)]
pub struct RevisePlan<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        mut,
        has_one = creator,
        constraint = plan.status == PlanStatus::Open @ RelayError::PlanClosed,
        constraint = plan.latest_version < MAX_VERSIONS @ RelayError::TooManyVersions,
    )]
    pub plan: Account<'info, Plan>,
    #[account(
        seeds = [VERSION_SEED, plan.key().as_ref(), &plan.latest_version.to_le_bytes()],
        bump = prev_version.bump
    )]
    pub prev_version: Account<'info, PlanVersion>,
    #[account(
        init,
        payer = creator,
        space = 8 + PlanVersion::INIT_SPACE,
        seeds = [VERSION_SEED, plan.key().as_ref(), &(plan.latest_version + 1).to_le_bytes()],
        bump
    )]
    pub new_version: Account<'info, PlanVersion>,
    pub system_program: Program<'info, System>,
}

pub fn handle_revise_plan(
    ctx: Context<RevisePlan>,
    entry_low: u64,
    entry_high: u64,
    expires_at: i64,
    content_hash: [u8; 32],
) -> Result<()> {
    let clock = Clock::get()?;
    validate_terms(entry_low, entry_high, expires_at, clock.unix_timestamp)?;

    let plan_key = ctx.accounts.plan.key();
    let creator = ctx.accounts.creator.key();
    let next = ctx
        .accounts
        .plan
        .latest_version
        .checked_add(1)
        .ok_or(RelayError::MathOverflow)?;
    let prev_terms_hash = ctx.accounts.prev_version.terms_hash;
    let (base_mint, quote_mint, base_decimals, quote_decimals) = {
        let p = &ctx.accounts.plan;
        (p.base_mint, p.quote_mint, p.base_decimals, p.quote_decimals)
    };
    let terms_hash = compute_terms_hash(&TermsInput {
        program_id: crate::ID,
        plan: plan_key,
        version: next,
        creator,
        base_mint,
        quote_mint,
        base_decimals,
        quote_decimals,
        entry_low,
        entry_high,
        expires_at,
        content_hash,
        prev_terms_hash,
    });

    let v = &mut ctx.accounts.new_version;
    v.plan = plan_key;
    v.version = next;
    v.entry_low = entry_low;
    v.entry_high = entry_high;
    v.expires_at = expires_at;
    v.published_at = clock.unix_timestamp;
    v.published_slot = clock.slot;
    v.content_hash = content_hash;
    v.prev_terms_hash = prev_terms_hash;
    v.terms_hash = terms_hash;
    v.bump = ctx.bumps.new_version;

    ctx.accounts.plan.latest_version = next;

    emit!(PlanRevised {
        plan: plan_key,
        creator,
        version: next,
        terms_hash,
        expires_at
    });
    Ok(())
}
