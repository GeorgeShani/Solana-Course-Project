//! TEST ONLY. Calls the first account (a target program) through CPI with the remaining accounts
//! and the instruction data it was given, preserving signer and writable flags. Used to prove that
//! `relay` refuses to be driven by another program.

use anchor_lang::solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    instruction::{AccountMeta, Instruction},
    program::invoke,
    program_error::ProgramError,
    pubkey::Pubkey,
};

entrypoint!(process);

fn process(_program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let (target, rest) = accounts
        .split_first()
        .ok_or(ProgramError::NotEnoughAccountKeys)?;
    let metas = rest
        .iter()
        .map(|a| {
            if a.is_writable {
                AccountMeta::new(*a.key, a.is_signer)
            } else {
                AccountMeta::new_readonly(*a.key, a.is_signer)
            }
        })
        .collect();
    let ix = Instruction {
        program_id: *target.key,
        accounts: metas,
        data: data.to_vec(),
    };
    invoke(&ix, accounts)
}
