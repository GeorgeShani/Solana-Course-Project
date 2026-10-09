//! TEST ONLY. A fake swap venue that the LiteSVM tests load at Jupiter's program id, so the
//! real anti-forgery rules in `relay` are exercised without needing mainnet liquidity.
//!
//! Instruction data: amount_in (u64 LE) || amount_out (u64 LE).
//! Accounts: user (signer), user_quote, pool_quote, user_base, pool_base, pool_authority, token_program.
//! The user pays `amount_in` quote tokens and receives `amount_out` base tokens; the pool authority
//! is the PDA ["pool"] of this program.

use anchor_lang::solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
};
use anchor_spl::token::spl_token;

entrypoint!(process);

fn amount(data: &[u8], at: usize) -> Result<u64, ProgramError> {
    let bytes: [u8; 8] = data
        .get(at..at + 8)
        .and_then(|s| s.try_into().ok())
        .ok_or(ProgramError::InvalidInstructionData)?;
    Ok(u64::from_le_bytes(bytes))
}

fn process(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let amount_in = amount(data, 0)?;
    let amount_out = amount(data, 8)?;

    let iter = &mut accounts.iter();
    let user = next_account_info(iter)?;
    let user_quote = next_account_info(iter)?;
    let pool_quote = next_account_info(iter)?;
    let user_base = next_account_info(iter)?;
    let pool_base = next_account_info(iter)?;
    let pool_authority = next_account_info(iter)?;
    let token_program = next_account_info(iter)?;

    invoke(
        &spl_token::instruction::transfer(
            token_program.key,
            user_quote.key,
            pool_quote.key,
            user.key,
            &[],
            amount_in,
        )?,
        &[
            user_quote.clone(),
            pool_quote.clone(),
            user.clone(),
            token_program.clone(),
        ],
    )?;

    let (authority, bump) = Pubkey::find_program_address(&[b"pool"], program_id);
    if authority != *pool_authority.key {
        return Err(ProgramError::InvalidSeeds);
    }
    invoke_signed(
        &spl_token::instruction::transfer(
            token_program.key,
            pool_base.key,
            user_base.key,
            pool_authority.key,
            &[],
            amount_out,
        )?,
        &[
            pool_base.clone(),
            user_base.clone(),
            pool_authority.clone(),
            token_program.clone(),
        ],
        &[&[b"pool", &[bump]]],
    )
}
