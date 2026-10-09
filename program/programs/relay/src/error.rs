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
}
