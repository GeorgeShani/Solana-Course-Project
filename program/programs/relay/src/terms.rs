use anchor_lang::prelude::*;

use crate::{constants::*, error::RelayError};

/// Shared bound/window rules for create_plan and revise_plan.
/// `now` is the cluster clock (unix seconds). Expiry is exclusive everywhere: a plan is expired
/// when `now >= expires_at`. At publish time the window must be at least MIN_WINDOW_SECS ahead.
pub fn validate_terms(entry_low: u64, entry_high: u64, expires_at: i64, now: i64) -> Result<()> {
    require!(
        entry_low > 0 && entry_low <= entry_high,
        RelayError::InvalidBounds
    );
    let earliest = now
        .checked_add(MIN_WINDOW_SECS)
        .ok_or(RelayError::MathOverflow)?;
    let latest = now
        .checked_add(MAX_WINDOW_SECS)
        .ok_or(RelayError::MathOverflow)?;
    require!(
        expires_at >= earliest && expires_at <= latest,
        RelayError::InvalidWindow
    );
    Ok(())
}
