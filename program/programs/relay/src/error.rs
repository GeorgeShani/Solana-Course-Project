use anchor_lang::prelude::*;

#[error_code]
pub enum RelayError {
    #[msg("This trading pair is not supported")]
    PairNotSupported,
    #[msg("Entry bounds must satisfy 0 < low <= high")]
    InvalidBounds,
    #[msg("The entry window must stay open between 1 minute and 7 days")]
    InvalidWindow,
    #[msg("The creator closed this plan")]
    PlanClosed,
    #[msg("A plan can have at most 16 versions")]
    TooManyVersions,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("This plan version has expired")]
    PlanExpired,
    #[msg("This plan version is not active yet")]
    PlanNotYetActive,
    #[msg("The plan was updated; review the latest version")]
    StaleVersion,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("This instruction cannot be called from another program")]
    CpiNotAllowed,
    #[msg("The transaction must be exactly: begin_follow, one swap, finish_follow")]
    InvalidInstructionLayout,
    #[msg("Only one swap signed by the follower may sit between begin_follow and finish_follow")]
    UnexpectedInstructionBetweenSnapshots,
    #[msg("The receipt is not pending")]
    ReceiptNotPending,
    #[msg("Token accounts must be the follower's associated token accounts")]
    TokenAccountMismatch,
    #[msg("The swap delivered no tokens")]
    NoOutputReceived,
    #[msg("The swap spent no tokens")]
    NoInputSpent,
    #[msg("The swap spent more than the amount the follower approved")]
    InputAboveMax,
    #[msg("The price paid is above the plan's entry range")]
    PriceAboveRange,
    #[msg("The price paid is below the plan's entry range")]
    PriceBelowRange,
}
