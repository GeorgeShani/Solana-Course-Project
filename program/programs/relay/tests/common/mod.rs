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
