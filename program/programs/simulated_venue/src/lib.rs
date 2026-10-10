//! Simulated swap venue (devnet).
//!
//! Devnet has no Jupiter market, so Relay's devnet build lets a follow's swap run through this
//! small pool instead. It swaps the pool's base token for its quote token at a price the pool's
//! admin sets: "Simulated swap venue (devnet)" everywhere it is shown. Test tokens only.
//!
//! It has NO authority over Relay. It never calls Relay and Relay never calls it: Relay only checks,
//! from the follower's own token balances, what a swap in the same transaction did. A pool that
//! quotes a silly price can only produce a silly price, which Relay's range check then judges.
//!
//! Anyone can create a pool (the pool address contains its admin), so the pool of a given admin is
//! the one the app uses. Staging an in-range fill through a pool of one's own is the known
//! limitation recorded in the implementation plan (section S).
//!
//! Prices are u64 quote atomic units per one whole base token, the same unit Relay uses.
//!
//! Instructions (first byte of the data):
//!
//! | tag | data                         | accounts (in order)                                                                          |
//! | --- | ---------------------------- | -------------------------------------------------------------------------------------------- |
//! | 0   | price u64                    | admin (signer, writable), pool (writable), base mint, quote mint, system program             |
//! | 1   | price u64                    | admin (signer), pool (writable)                                                              |
//! | 2   | amount_in u64, min_out u64   | user (signer, writable), user quote, user base, pool, quote vault, base vault, token program |
//!
//! The pool is the PDA `["pool", admin, base_mint, quote_mint]`. Its vaults are the pool's
//! associated token accounts, created by the admin and funded with plain token transfers.
//! `swap` moves `amount_in` quote tokens from the user to the quote vault and
//! `floor(amount_in * 10^base_decimals / price)` base tokens from the base vault to the user.

use anchor_lang::solana_program::{
    account_info::AccountInfo, entrypoint, entrypoint::ProgramResult,
    instruction::Instruction as CpiInstruction, program_error::ProgramError, pubkey::Pubkey,
    rent::Rent, system_instruction, system_program,
};
use anchor_spl::token::spl_token;
use solana_sysvar::Sysvar;

entrypoint!(process);

/// Cross-program invocation. On the chain this is the ordinary `invoke_signed`. Native unit tests
/// have no runtime, so off-chain builds hand the call to the syscall stubs the tests install.
#[cfg(target_os = "solana")]
fn cpi(ix: &CpiInstruction, infos: &[AccountInfo], seeds: &[&[&[u8]]]) -> ProgramResult {
    anchor_lang::solana_program::program::invoke_signed(ix, infos, seeds)
}

#[cfg(not(target_os = "solana"))]
fn cpi(ix: &CpiInstruction, infos: &[AccountInfo], seeds: &[&[&[u8]]]) -> ProgramResult {
    solana_sysvar::program_stubs::sol_invoke_signed(ix, infos, seeds)
}

/// A CPI that needs no program signature (the instruction's signers already signed the transaction).
fn cpi_unsigned(ix: &CpiInstruction, infos: &[AccountInfo]) -> ProgramResult {
    cpi(ix, infos, &[])
}

pub const POOL_SEED: &[u8] = b"pool";
/// Bytes in a pool account.
pub const POOL_LEN: usize = 108;
const POOL_TAG: u8 = 1;
/// The most decimals a base token may have (keeps 10^decimals inside u128 with room to spare).
const MAX_BASE_DECIMALS: u8 = 18;
/// Bytes in a classic SPL Token mint and token account (`Pack::LEN` of the SPL Token states).
const MINT_LEN: usize = 82;
const TOKEN_ACCOUNT_LEN: usize = 165;

/// The classic SPL Associated Token Account program.
pub const ATA_PROGRAM_ID: Pubkey =
    Pubkey::from_str_const("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

pub const TAG_INIT_POOL: u8 = 0;
pub const TAG_SET_PRICE: u8 = 1;
pub const TAG_SWAP: u8 = 2;

/// Errors, returned as `ProgramError::Custom(code)`. The codes are part of the interface:
/// `domain/src/solana/venue.ts` maps them to plain text.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum VenueError {
    BadInstruction = 1,
    MissingSignature = 2,
    WrongPoolAddress = 3,
    PoolNotReady = 4,
    PoolExists = 5,
    NotAdmin = 6,
    InvalidPrice = 7,
    InvalidMint = 8,
    WrongVault = 9,
    WrongTokenAccount = 10,
    WrongTokenProgram = 11,
    NothingToReceive = 12,
    SlippageExceeded = 13,
    MathOverflow = 14,
}

impl From<VenueError> for ProgramError {
    fn from(e: VenueError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

// ------------------------------------------------------------------------------------ pure core

/// `floor(amount_in * 10^base_decimals / price)`: base atomic units for `amount_in` quote units.
pub fn swap_out(amount_in: u64, price: u64, base_decimals: u8) -> Result<u64, VenueError> {
    if price == 0 {
        return Err(VenueError::InvalidPrice);
    }
    let scale = 10u128
        .checked_pow(u32::from(base_decimals))
        .ok_or(VenueError::MathOverflow)?;
    let numerator = u128::from(amount_in)
        .checked_mul(scale)
        .ok_or(VenueError::MathOverflow)?;
    u64::try_from(numerator / u128::from(price)).map_err(|_| VenueError::MathOverflow)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Pool {
    pub bump: u8,
    pub base_decimals: u8,
    pub admin: Pubkey,
    pub base_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub price: u64,
}

impl Pool {
    /// Layout: tag u8 | bump u8 | base_decimals u8 | reserved u8 | admin 32 | base_mint 32 |
    /// quote_mint 32 | price u64 LE.
    pub fn pack(&self) -> [u8; POOL_LEN] {
        let mut out = [0u8; POOL_LEN];
        out[0] = POOL_TAG;
        out[1] = self.bump;
        out[2] = self.base_decimals;
        out[4..36].copy_from_slice(self.admin.as_ref());
        out[36..68].copy_from_slice(self.base_mint.as_ref());
        out[68..100].copy_from_slice(self.quote_mint.as_ref());
        out[100..108].copy_from_slice(&self.price.to_le_bytes());
        out
    }

    pub fn unpack(data: &[u8]) -> Result<Pool, VenueError> {
        if data.len() != POOL_LEN || data[0] != POOL_TAG {
            return Err(VenueError::PoolNotReady);
        }
        let key = |from: usize| {
            Pubkey::try_from(&data[from..from + 32]).map_err(|_| VenueError::PoolNotReady)
        };
        let price = <[u8; 8]>::try_from(&data[100..108]).map_err(|_| VenueError::PoolNotReady)?;
        Ok(Pool {
            bump: data[1],
            base_decimals: data[2],
            admin: key(4)?,
            base_mint: key(36)?,
            quote_mint: key(68)?,
            price: u64::from_le_bytes(price),
        })
    }
}

/// The pool's address and bump: `["pool", admin, base_mint, quote_mint]`.
pub fn pool_address(
    program_id: &Pubkey,
    admin: &Pubkey,
    base_mint: &Pubkey,
    quote_mint: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            POOL_SEED,
            admin.as_ref(),
            base_mint.as_ref(),
            quote_mint.as_ref(),
        ],
        program_id,
    )
}

/// A pool's vault for `mint`: the pool's classic associated token account.
pub fn vault_address(pool: &Pubkey, mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[pool.as_ref(), spl_token::ID.as_ref(), mint.as_ref()],
        &ATA_PROGRAM_ID,
    )
    .0
}

#[derive(Debug, PartialEq, Eq)]
pub enum Instruction {
    InitPool { price: u64 },
    SetPrice { price: u64 },
    Swap { amount_in: u64, min_out: u64 },
}

fn read_u64(data: &[u8], at: usize) -> Result<u64, VenueError> {
    data.get(at..at + 8)
        .and_then(|s| <[u8; 8]>::try_from(s).ok())
        .map(u64::from_le_bytes)
        .ok_or(VenueError::BadInstruction)
}

impl Instruction {
    /// Exact lengths only: trailing bytes are an error, not ignored.
    pub fn parse(data: &[u8]) -> Result<Instruction, VenueError> {
        let (tag, expected_len) = match data.first() {
            Some(&TAG_INIT_POOL) | Some(&TAG_SET_PRICE) => (data[0], 9),
            Some(&TAG_SWAP) => (TAG_SWAP, 17),
            _ => return Err(VenueError::BadInstruction),
        };
        if data.len() != expected_len {
            return Err(VenueError::BadInstruction);
        }
        Ok(match tag {
            TAG_INIT_POOL => Instruction::InitPool {
                price: read_u64(data, 1)?,
            },
            TAG_SET_PRICE => Instruction::SetPrice {
                price: read_u64(data, 1)?,
            },
            _ => Instruction::Swap {
                amount_in: read_u64(data, 1)?,
                min_out: read_u64(data, 9)?,
            },
        })
    }
}

/// What a validated `swap` will do. Computed before any tokens move.
#[derive(Debug, PartialEq, Eq)]
pub struct SwapPlan {
    pub amount_in: u64,
    pub amount_out: u64,
    pub pool: Pool,
}

/// `(mint, owner)` of an initialized classic SPL token account.
fn token_account(account: &AccountInfo) -> Result<(Pubkey, Pubkey), VenueError> {
    if account.owner != &spl_token::ID {
        return Err(VenueError::WrongTokenAccount);
    }
    let data = account
        .try_borrow_data()
        .map_err(|_| VenueError::WrongTokenAccount)?;
    // SPL Token Account: mint 0..32, owner 32..64, amount 64..72, ..., state at 108 (1 = initialized).
    if data.len() != TOKEN_ACCOUNT_LEN || data[108] != 1 {
        return Err(VenueError::WrongTokenAccount);
    }
    let mint = Pubkey::try_from(&data[0..32]).map_err(|_| VenueError::WrongTokenAccount)?;
    let owner = Pubkey::try_from(&data[32..64]).map_err(|_| VenueError::WrongTokenAccount)?;
    Ok((mint, owner))
}

/// The pool stored in `pool_account`, after checking it is this program's pool at its own address.
fn load_pool(program_id: &Pubkey, pool_account: &AccountInfo) -> Result<Pool, VenueError> {
    if pool_account.owner != program_id {
        return Err(VenueError::PoolNotReady);
    }
    let pool = {
        let data = pool_account
            .try_borrow_data()
            .map_err(|_| VenueError::PoolNotReady)?;
        Pool::unpack(&data)?
    };
    let expected = Pubkey::create_program_address(
        &[
            POOL_SEED,
            pool.admin.as_ref(),
            pool.base_mint.as_ref(),
            pool.quote_mint.as_ref(),
            &[pool.bump],
        ],
        program_id,
    )
    .map_err(|_| VenueError::WrongPoolAddress)?;
    if expected != *pool_account.key {
        return Err(VenueError::WrongPoolAddress);
    }
    Ok(pool)
}

/// Checks every account of a `swap` and prices it. Moves nothing.
pub fn plan_swap(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount_in: u64,
    min_out: u64,
) -> Result<SwapPlan, ProgramError> {
    let [user, user_quote, user_base, pool_account, quote_vault, base_vault, token_program] =
        accounts
    else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if !user.is_signer {
        return Err(VenueError::MissingSignature.into());
    }
    if token_program.key != &spl_token::ID {
        return Err(VenueError::WrongTokenProgram.into());
    }
    let pool = load_pool(program_id, pool_account)?;

    if *quote_vault.key != vault_address(pool_account.key, &pool.quote_mint)
        || *base_vault.key != vault_address(pool_account.key, &pool.base_mint)
    {
        return Err(VenueError::WrongVault.into());
    }
    // The user's own accounts, for the right tokens: the swap never touches anyone else's balance.
    let (quote_mint, quote_owner) = token_account(user_quote)?;
    let (base_mint, base_owner) = token_account(user_base)?;
    if quote_mint != pool.quote_mint
        || base_mint != pool.base_mint
        || quote_owner != *user.key
        || base_owner != *user.key
    {
        return Err(VenueError::WrongTokenAccount.into());
    }

    let amount_out = swap_out(amount_in, pool.price, pool.base_decimals)?;
    if amount_out == 0 {
        return Err(VenueError::NothingToReceive.into());
    }
    if amount_out < min_out {
        return Err(VenueError::SlippageExceeded.into());
    }
    Ok(SwapPlan {
        amount_in,
        amount_out,
        pool,
    })
}

// ----------------------------------------------------------------------------------- processing

fn process(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    match Instruction::parse(data)? {
        Instruction::InitPool { price } => init_pool(program_id, accounts, price),
        Instruction::SetPrice { price } => set_price(program_id, accounts, price),
        Instruction::Swap { amount_in, min_out } => swap(program_id, accounts, amount_in, min_out),
    }
}

/// Checks every account of `init_pool` and returns the pool it will create. Creates nothing.
pub fn plan_init(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    price: u64,
) -> Result<Pool, ProgramError> {
    let [admin, pool_account, base_mint, quote_mint, system_program_account] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if !admin.is_signer {
        return Err(VenueError::MissingSignature.into());
    }
    if price == 0 {
        return Err(VenueError::InvalidPrice.into());
    }
    if system_program_account.key != &system_program::ID {
        return Err(VenueError::BadInstruction.into());
    }
    if base_mint.key == quote_mint.key {
        return Err(VenueError::InvalidMint.into());
    }
    let base_decimals = mint_decimals(base_mint)?;
    mint_decimals(quote_mint)?;
    if base_decimals > MAX_BASE_DECIMALS {
        return Err(VenueError::InvalidMint.into());
    }

    let (expected, bump) = pool_address(program_id, admin.key, base_mint.key, quote_mint.key);
    if expected != *pool_account.key {
        return Err(VenueError::WrongPoolAddress.into());
    }
    // Not yet created: still owned by the system program and empty.
    if pool_account.owner != &system_program::ID || !pool_account.data_is_empty() {
        return Err(VenueError::PoolExists.into());
    }
    Ok(Pool {
        bump,
        base_decimals,
        admin: *admin.key,
        base_mint: *base_mint.key,
        quote_mint: *quote_mint.key,
        price,
    })
}

fn init_pool(program_id: &Pubkey, accounts: &[AccountInfo], price: u64) -> ProgramResult {
    let pool = plan_init(program_id, accounts, price)?;
    let [admin, pool_account, _base_mint, _quote_mint, system_program_account] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    let seeds: &[&[u8]] = &[
        POOL_SEED,
        pool.admin.as_ref(),
        pool.base_mint.as_ref(),
        pool.quote_mint.as_ref(),
        &[pool.bump],
    ];
    let needed = Rent::get()?.minimum_balance(POOL_LEN);
    if pool_account.lamports() == 0 {
        cpi(
            &system_instruction::create_account(
                admin.key,
                pool_account.key,
                needed,
                POOL_LEN as u64,
                program_id,
            ),
            &[
                admin.clone(),
                pool_account.clone(),
                system_program_account.clone(),
            ],
            &[seeds],
        )?;
    } else {
        // Someone sent lamports to the address first. create_account would refuse it, so top up,
        // size and assign it instead (the same thing Anchor's `init` does).
        let top_up = needed.saturating_sub(pool_account.lamports());
        if top_up > 0 {
            cpi_unsigned(
                &system_instruction::transfer(admin.key, pool_account.key, top_up),
                &[
                    admin.clone(),
                    pool_account.clone(),
                    system_program_account.clone(),
                ],
            )?;
        }
        cpi(
            &system_instruction::allocate(pool_account.key, POOL_LEN as u64),
            &[pool_account.clone(), system_program_account.clone()],
            &[seeds],
        )?;
        cpi(
            &system_instruction::assign(pool_account.key, program_id),
            &[pool_account.clone(), system_program_account.clone()],
            &[seeds],
        )?;
    }
    pool_account
        .try_borrow_mut_data()?
        .copy_from_slice(&pool.pack());
    Ok(())
}

/// Decimals of an initialized classic SPL mint (82 bytes: decimals at 44, initialized flag at 45).
fn mint_decimals(mint: &AccountInfo) -> Result<u8, VenueError> {
    if mint.owner != &spl_token::ID {
        return Err(VenueError::InvalidMint);
    }
    let data = mint
        .try_borrow_data()
        .map_err(|_| VenueError::InvalidMint)?;
    if data.len() != MINT_LEN || data[45] != 1 {
        return Err(VenueError::InvalidMint);
    }
    Ok(data[44])
}

fn set_price(program_id: &Pubkey, accounts: &[AccountInfo], price: u64) -> ProgramResult {
    let [admin, pool_account] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if !admin.is_signer {
        return Err(VenueError::MissingSignature.into());
    }
    if price == 0 {
        return Err(VenueError::InvalidPrice.into());
    }
    let pool = load_pool(program_id, pool_account)?;
    if pool.admin != *admin.key {
        return Err(VenueError::NotAdmin.into());
    }
    pool_account.try_borrow_mut_data()?[100..108].copy_from_slice(&price.to_le_bytes());
    Ok(())
}

fn swap(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount_in: u64,
    min_out: u64,
) -> ProgramResult {
    let plan = plan_swap(program_id, accounts, amount_in, min_out)?;
    let [user, user_quote, user_base, pool_account, quote_vault, base_vault, token_program] =
        accounts
    else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // The user pays first...
    cpi_unsigned(
        &spl_token::instruction::transfer(
            token_program.key,
            user_quote.key,
            quote_vault.key,
            user.key,
            &[],
            plan.amount_in,
        )?,
        &[
            user_quote.clone(),
            quote_vault.clone(),
            user.clone(),
            token_program.clone(),
        ],
    )?;
    // ...then the pool, signing as its own address, pays out.
    cpi(
        &spl_token::instruction::transfer(
            token_program.key,
            base_vault.key,
            user_base.key,
            pool_account.key,
            &[],
            plan.amount_out,
        )?,
        &[
            base_vault.clone(),
            user_base.clone(),
            pool_account.clone(),
            token_program.clone(),
        ],
        &[&[
            POOL_SEED,
            plan.pool.admin.as_ref(),
            plan.pool.base_mint.as_ref(),
            plan.pool.quote_mint.as_ref(),
            &[plan.pool.bump],
        ]],
    )
}

#[cfg(test)]
mod tests;
