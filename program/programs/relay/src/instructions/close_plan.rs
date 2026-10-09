use anchor_lang::prelude::*;

use crate::{
    error::RelayError,
    events::PlanClosedEvent,
    state::{Plan, PlanStatus},
};

/// Stops new entries. History is untouched: no version is removed or edited.
#[derive(Accounts)]
pub struct ClosePlan<'info> {
    pub creator: Signer<'info>,
    #[account(
        mut,
        has_one = creator,
        constraint = plan.status == PlanStatus::Open @ RelayError::PlanClosed,
    )]
    pub plan: Account<'info, Plan>,
}

pub fn handle_close_plan(ctx: Context<ClosePlan>) -> Result<()> {
    ctx.accounts.plan.status = PlanStatus::Closed;
    emit!(PlanClosedEvent {
        plan: ctx.accounts.plan.key(),
        creator: ctx.accounts.creator.key()
    });
    Ok(())
}
