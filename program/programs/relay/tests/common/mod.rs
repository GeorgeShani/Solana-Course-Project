#![allow(dead_code)]
//! Shared LiteSVM test harness for the Relay program.

use {
    anchor_lang::{
        prelude::{Clock, Pubkey},
        solana_program::{instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    litesvm::{
        types::{FailedTransactionMetadata, TransactionMetadata},
        LiteSVM,
    },
    solana_account::Account,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

pub use relay::{JUP_MINT, USDC_MINT, WSOL_MINT};

/// "Now" for every test unless a test warps the clock.
pub const T0: i64 = 1_790_000_000;
pub const HOUR: i64 = 3600;
pub const DAY: i64 = 24 * HOUR;

pub type Sent = Result<TransactionMetadata, FailedTransactionMetadata>;

pub struct Env {
    pub svm: LiteSVM,
    pub creator: Keypair,
}

/// A classic SPL Token mint account (82 bytes, initialized, no authorities).
pub fn mint_account(svm: &LiteSVM, decimals: u8) -> Account {
    let mut data = vec![0u8; 82];
    data[44] = decimals;
    data[45] = 1; // is_initialized
    Account {
        lamports: svm.minimum_balance_for_rent_exemption(82),
        data,
        owner: anchor_spl::token::ID,
        executable: false,
        rent_epoch: 0,
    }
}

impl Env {
    pub fn new() -> Self {
        let mut svm = LiteSVM::new();
        let bytes = include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/relay.so"));
        svm.add_program(relay::id(), bytes).unwrap();
        let creator = Keypair::new();
        svm.airdrop(&creator.pubkey(), 10_000_000_000).unwrap();
        for (mint, decimals) in [(WSOL_MINT, 9u8), (JUP_MINT, 6), (USDC_MINT, 6)] {
            let acc = mint_account(&svm, decimals);
            svm.set_account(mint, acc).unwrap();
        }
        let mut env = Env { svm, creator };
        env.set_time(T0);
        env
    }

    pub fn set_time(&mut self, unix: i64) {
        let mut clock = self.svm.get_sysvar::<Clock>();
        clock.unix_timestamp = unix;
        self.svm.set_sysvar(&clock);
    }

    pub fn now(&self) -> i64 {
        self.svm.get_sysvar::<Clock>().unix_timestamp
    }

    pub fn funded(&mut self) -> Keypair {
        let kp = Keypair::new();
        self.svm.airdrop(&kp.pubkey(), 10_000_000_000).unwrap();
        kp
    }

    /// Sends one transaction and rolls the blockhash so identical transactions are not deduplicated.
    pub fn send(&mut self, ixs: &[Instruction], payer: &Keypair, signers: &[&Keypair]) -> Sent {
        let blockhash = self.svm.latest_blockhash();
        let msg = Message::new_with_blockhash(ixs, Some(&payer.pubkey()), &blockhash);
        let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), signers).unwrap();
        let res = self.svm.send_transaction(tx);
        self.svm.expire_blockhash();
        res
    }

    pub fn read<T: AccountDeserialize>(&self, key: &Pubkey) -> T {
        let acc = self
            .svm
            .get_account(key)
            .unwrap_or_else(|| panic!("account {key} missing"));
        T::try_deserialize(&mut &acc.data[..]).unwrap()
    }

    pub fn raw(&self, key: &Pubkey) -> Vec<u8> {
        self.svm
            .get_account(key)
            .map(|a| a.data)
            .unwrap_or_default()
    }
}

pub fn plan_pda(creator: &Pubkey, plan_id: u64) -> Pubkey {
    Pubkey::find_program_address(
        &[relay::PLAN_SEED, creator.as_ref(), &plan_id.to_le_bytes()],
        &relay::id(),
    )
    .0
}

pub fn version_pda(plan: &Pubkey, version: u16) -> Pubkey {
    Pubkey::find_program_address(
        &[relay::VERSION_SEED, plan.as_ref(), &version.to_le_bytes()],
        &relay::id(),
    )
    .0
}

#[derive(Clone, Copy)]
pub struct Terms {
    pub low: u64,
    pub high: u64,
    pub expires_at: i64,
    pub content_hash: [u8; 32],
}

impl Terms {
    /// $180-$185 per SOL, one hour window from T0.
    pub fn standard() -> Self {
        Terms {
            low: 180_000_000,
            high: 185_000_000,
            expires_at: T0 + HOUR,
            content_hash: [7u8; 32],
        }
    }
}

pub fn create_plan_ix(
    creator: &Pubkey,
    plan_id: u64,
    t: Terms,
    base: Pubkey,
    quote: Pubkey,
) -> Instruction {
    let plan = plan_pda(creator, plan_id);
    Instruction::new_with_bytes(
        relay::id(),
        &relay::instruction::CreatePlan {
            plan_id,
            entry_low: t.low,
            entry_high: t.high,
            expires_at: t.expires_at,
            content_hash: t.content_hash,
        }
        .data(),
        relay::accounts::CreatePlan {
            creator: *creator,
            plan,
            version: version_pda(&plan, 1),
            base_mint: base,
            quote_mint: quote,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

/// `prev`/`next` are the version numbers whose PDAs are passed; a correct call uses (latest, latest + 1).
pub fn revise_plan_ix(
    creator: &Pubkey,
    plan: &Pubkey,
    prev: u16,
    next: u16,
    t: Terms,
) -> Instruction {
    Instruction::new_with_bytes(
        relay::id(),
        &relay::instruction::RevisePlan {
            entry_low: t.low,
            entry_high: t.high,
            expires_at: t.expires_at,
            content_hash: t.content_hash,
        }
        .data(),
        relay::accounts::RevisePlan {
            creator: *creator,
            plan: *plan,
            prev_version: version_pda(plan, prev),
            new_version: version_pda(plan, next),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

pub fn close_plan_ix(creator: &Pubkey, plan: &Pubkey) -> Instruction {
    Instruction::new_with_bytes(
        relay::id(),
        &relay::instruction::ClosePlan {}.data(),
        relay::accounts::ClosePlan {
            creator: *creator,
            plan: *plan,
        }
        .to_account_metas(None),
    )
}

/// Asserts that the transaction failed and that the program logs mention `needle`
/// (for example "Error Code: PlanClosed").
pub fn assert_fails_with(res: Sent, needle: &str) {
    match res {
        Ok(_) => panic!("expected failure containing {needle:?}, but the transaction succeeded"),
        Err(e) => {
            let logs = e.meta.logs.join("\n");
            assert!(
                logs.contains(needle),
                "expected {needle:?} in logs:\n{logs}\n(err: {:?})",
                e.err
            );
        }
    }
}

// ---------------------------------------------------------------------------- tokens and venues

/// Jupiter's program id, where the tests load the mock swap venue.
pub fn jupiter_id() -> Pubkey {
    relay::JUPITER_PROGRAM_IDS[0]
}

pub fn ata(owner: &Pubkey, mint: &Pubkey) -> Pubkey {
    relay::layout::ata_address(owner, mint)
}

/// A classic SPL token account (165 bytes, initialized).
pub fn token_account(svm: &LiteSVM, mint: &Pubkey, owner: &Pubkey, amount: u64) -> Account {
    let mut data = vec![0u8; 165];
    data[0..32].copy_from_slice(mint.as_ref());
    data[32..64].copy_from_slice(owner.as_ref());
    data[64..72].copy_from_slice(&amount.to_le_bytes());
    data[108] = 1; // state = Initialized
    Account {
        lamports: svm.minimum_balance_for_rent_exemption(165),
        data,
        owner: anchor_spl::token::ID,
        executable: false,
        rent_epoch: 0,
    }
}

impl Env {
    pub fn set_token(&mut self, address: Pubkey, mint: &Pubkey, owner: &Pubkey, amount: u64) {
        let acc = token_account(&self.svm, mint, owner, amount);
        self.svm.set_account(address, acc).unwrap();
    }

    pub fn token_amount(&self, address: &Pubkey) -> u64 {
        let data = self.raw(address);
        u64::from_le_bytes(data[64..72].try_into().unwrap())
    }

    /// Loads a test-only program built by `cargo build-sbf` (see Anchor.toml `test` script).
    pub fn load_test_program(&mut self, id: Pubkey, file: &str) {
        let path = format!("{}/../deploy/{file}", env!("CARGO_TARGET_TMPDIR"));
        let bytes = std::fs::read(&path)
            .unwrap_or_else(|e| panic!("missing {path}: {e}. Run `bun run program:test`."));
        self.svm.add_program(id, &bytes).unwrap();
    }
}

pub fn pool_authority() -> Pubkey {
    Pubkey::find_program_address(&[b"pool"], &jupiter_id()).0
}

pub fn receipt_pda(plan_version: &Pubkey, follower: &Pubkey, nonce: u64) -> Pubkey {
    Pubkey::find_program_address(
        &[
            relay::RECEIPT_SEED,
            plan_version.as_ref(),
            follower.as_ref(),
            &nonce.to_le_bytes(),
        ],
        &relay::id(),
    )
    .0
}

pub fn begin_follow_ix(
    follower: &Pubkey,
    plan: &Pubkey,
    version: u16,
    nonce: u64,
    max_quote_in: u64,
    base: &Pubkey,
    quote: &Pubkey,
) -> Instruction {
    let plan_version = version_pda(plan, version);
    Instruction::new_with_bytes(
        relay::id(),
        &relay::instruction::BeginFollow {
            version,
            nonce,
            max_quote_in,
        }
        .data(),
        relay::accounts::BeginFollow {
            follower: *follower,
            plan: *plan,
            plan_version,
            receipt: receipt_pda(&plan_version, follower, nonce),
            follower_base: ata(follower, base),
            follower_quote: ata(follower, quote),
            instructions: solana_instructions_sysvar::ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

pub fn finish_follow_ix(
    follower: &Pubkey,
    plan: &Pubkey,
    version: u16,
    nonce: u64,
    base: &Pubkey,
    quote: &Pubkey,
) -> Instruction {
    let plan_version = version_pda(plan, version);
    Instruction::new_with_bytes(
        relay::id(),
        &relay::instruction::FinishFollow {}.data(),
        relay::accounts::FinishFollow {
            follower: *follower,
            receipt: receipt_pda(&plan_version, follower, nonce),
            follower_base: ata(follower, base),
            follower_quote: ata(follower, quote),
            plan_version,
            plan: *plan,
        }
        .to_account_metas(None),
    )
}

/// The mock venue: `user` pays `amount_in` USDC from `user_quote` and receives `amount_out` base
/// tokens into `user_base`, from the venue's pool.
pub fn mock_swap_ix(
    user: &Pubkey,
    user_quote: &Pubkey,
    user_base: &Pubkey,
    pool_quote: &Pubkey,
    pool_base: &Pubkey,
    amount_in: u64,
    amount_out: u64,
) -> Instruction {
    let mut data = amount_in.to_le_bytes().to_vec();
    data.extend_from_slice(&amount_out.to_le_bytes());
    Instruction {
        program_id: jupiter_id(),
        accounts: vec![
            anchor_lang::solana_program::instruction::AccountMeta::new(*user, true),
            anchor_lang::solana_program::instruction::AccountMeta::new(*user_quote, false),
            anchor_lang::solana_program::instruction::AccountMeta::new(*pool_quote, false),
            anchor_lang::solana_program::instruction::AccountMeta::new(*user_base, false),
            anchor_lang::solana_program::instruction::AccountMeta::new(*pool_base, false),
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                pool_authority(),
                false,
            ),
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_spl::token::ID,
                false,
            ),
        ],
        data,
    }
}
