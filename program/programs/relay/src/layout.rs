//! Anti-forgery checks for the follow pair.
//!
//! A receipt is a claim that "this swap really happened inside the plan's range". It is only worth
//! anything if nothing else could have changed the follower's balances between the two snapshots.
//! These checks pin the transaction to exactly:
//!
//!   ... begin_follow, <one swap signed only by the follower>, finish_follow ...
//!
//! Plain English: `begin_follow` photographs the follower's two token balances, exactly one swap
//! runs, `finish_follow` photographs them again. We refuse any transaction where anything else
//! could happen in between, or where another program is the one calling us.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::{get_stack_height, TRANSACTION_LEVEL_STACK_HEIGHT};
use anchor_lang::Discriminator;
use solana_instructions_sysvar::{load_current_index_checked, load_instruction_at_checked};

use crate::{constants::*, error::RelayError};

/// Both follow instructions must be top-level instructions of the transaction. If another program
/// CPI'd into us, the instructions sysvar would describe the attacker's instruction, not ours.
pub fn require_top_level() -> Result<()> {
    require!(
        get_stack_height() == TRANSACTION_LEVEL_STACK_HEIGHT,
        RelayError::CpiNotAllowed
    );
    Ok(())
}

/// The follower's associated token account for `mint` (the only token accounts we accept).
pub fn ata_address(owner: &Pubkey, mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            owner.as_ref(),
            anchor_spl::token::ID.as_ref(),
            mint.as_ref(),
        ],
        &ATA_PROGRAM_ID,
    )
    .0
}

pub struct FollowAccounts<'a> {
    pub receipt: &'a Pubkey,
    pub follower: &'a Pubkey,
    pub follower_base: &'a Pubkey,
    pub follower_quote: &'a Pubkey,
}

/// Called from `begin_follow`. Verifies the whole transaction layout around the current instruction.
pub fn verify_follow_layout(ix_sysvar: &AccountInfo, a: &FollowAccounts) -> Result<()> {
    let begin_disc = crate::instruction::BeginFollow::DISCRIMINATOR;
    let finish_disc = crate::instruction::FinishFollow::DISCRIMINATOR;

    let current = load_current_index_checked(ix_sysvar)? as usize;

    // 1. The instruction being executed must really be our begin_follow at the top level.
    let me = load_instruction_at_checked(current, ix_sysvar)?;
    require!(
        me.program_id == crate::ID && me.data.starts_with(begin_disc),
        RelayError::CpiNotAllowed
    );

    // 2. Exactly one begin_follow and one finish_follow in the whole transaction.
    let (mut begins, mut finishes) = (0u32, 0u32);
    let mut index = 0usize;
    while let Ok(ix) = load_instruction_at_checked(index, ix_sysvar) {
        if ix.program_id == crate::ID {
            if ix.data.starts_with(begin_disc) {
                begins += 1;
            } else if ix.data.starts_with(finish_disc) {
                finishes += 1;
            }
        }
        index += 1;
    }
    require!(
        begins == 1 && finishes == 1,
        RelayError::InvalidInstructionLayout
    );

    // 3. finish_follow is exactly two instructions later and names this receipt and follower.
    let finish = load_instruction_at_checked(current + 2, ix_sysvar)
        .map_err(|_| error!(RelayError::InvalidInstructionLayout))?;
    require!(
        finish.program_id == crate::ID && finish.data.starts_with(finish_disc),
        RelayError::InvalidInstructionLayout
    );
    let finish_follower = finish.accounts.first();
    let finish_receipt = finish.accounts.get(1);
    require!(
        finish_follower.is_some_and(|m| m.pubkey == *a.follower && m.is_signer)
            && finish_receipt.is_some_and(|m| m.pubkey == *a.receipt),
        RelayError::InvalidInstructionLayout
    );

    // 4. The single instruction between them is one swap, through an allowed swap program (Jupiter
    //    on the test fork, the simulated venue on devnet), that only the follower signs and that
    //    touches the follower's own base and quote accounts. This is what stops a second wallet
    //    from swapping into the follower's account to fake an in-range price.
    let swap = load_instruction_at_checked(current + 1, ix_sysvar)
        .map_err(|_| error!(RelayError::InvalidInstructionLayout))?;
    require!(
        SWAP_PROGRAM_IDS.contains(&swap.program_id),
        RelayError::UnexpectedInstructionBetweenSnapshots
    );
    let mut follower_signs = false;
    for meta in swap.accounts.iter().filter(|m| m.is_signer) {
        require!(
            meta.pubkey == *a.follower,
            RelayError::UnexpectedInstructionBetweenSnapshots
        );
        follower_signs = true;
    }
    require!(
        follower_signs,
        RelayError::UnexpectedInstructionBetweenSnapshots
    );
    let touches = |key: &Pubkey| swap.accounts.iter().any(|m| m.pubkey == *key);
    require!(
        touches(a.follower_base) && touches(a.follower_quote),
        RelayError::UnexpectedInstructionBetweenSnapshots
    );
    Ok(())
}
