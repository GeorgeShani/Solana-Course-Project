#![cfg(not(feature = "devnet"))]
// These tests are written for the default (test fork) build. `tests/devnet.rs` covers `--features devnet`.

mod common;

use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{
            instruction::{AccountMeta, Instruction},
            system_instruction,
        },
        InstructionData,
    },
    anchor_spl::token::spl_token,
    common::*,
    relay::state::{FollowReceipt, ReceiptStatus},
    solana_keypair::Keypair,
    solana_signer::Signer,
};

const VERSION_1: u16 = 1;
const USDC_100: u64 = 100_000_000;
/// 100 USDC for this many lamports is ~$183.00 per SOL: inside the standard $180-$185 range.
const SOL_AT_183: u64 = 546_448_087;

struct World {
    env: Env,
    follower: Keypair,
    plan: Pubkey,
    pool_quote: Pubkey,
    pool_base: Pubkey,
}

impl World {
    /// A SOL/USDC plan ($180-$185, one hour), a follower holding 1,000 USDC, and a mock venue
    /// loaded at Jupiter's program id with deep liquidity.
    fn new() -> Self {
        let mut env = Env::new();
        env.load_test_program(jupiter_id(), "mock_swap.so");
        let creator = env.creator.insecure_clone();
        let ix = create_plan_ix(
            &creator.pubkey(),
            1,
            Terms::standard(),
            WSOL_MINT,
            USDC_MINT,
        );
        env.send(&[ix], &creator, &[&creator]).expect("create_plan");
        let plan = plan_pda(&creator.pubkey(), 1);

        let follower = env.funded();
        env.set_token(
            ata(&follower.pubkey(), &USDC_MINT),
            &USDC_MINT,
            &follower.pubkey(),
            1_000_000_000,
        );
        env.set_token(
            ata(&follower.pubkey(), &WSOL_MINT),
            &WSOL_MINT,
            &follower.pubkey(),
            0,
        );

        let pool_quote = Pubkey::new_unique();
        let pool_base = Pubkey::new_unique();
        env.set_token(pool_quote, &USDC_MINT, &pool_authority(), 1_000_000_000_000);
        env.set_token(
            pool_base,
            &WSOL_MINT,
            &pool_authority(),
            1_000_000_000_000_000,
        );
        World {
            env,
            follower,
            plan,
            pool_quote,
            pool_base,
        }
    }

    fn begin(&self, nonce: u64, max_quote_in: u64) -> Instruction {
        begin_follow_ix(
            &self.follower.pubkey(),
            &self.plan,
            VERSION_1,
            nonce,
            max_quote_in,
            &WSOL_MINT,
            &USDC_MINT,
        )
    }

    fn finish(&self, nonce: u64) -> Instruction {
        finish_follow_ix(
            &self.follower.pubkey(),
            &self.plan,
            VERSION_1,
            nonce,
            &WSOL_MINT,
            &USDC_MINT,
        )
    }

    fn swap(&self, amount_in: u64, amount_out: u64) -> Instruction {
        let f = self.follower.pubkey();
        mock_swap_ix(
            &f,
            &ata(&f, &USDC_MINT),
            &ata(&f, &WSOL_MINT),
            &self.pool_quote,
            &self.pool_base,
            amount_in,
            amount_out,
        )
    }

    fn receipt_key(&self, nonce: u64) -> Pubkey {
        receipt_pda(
            &version_pda(&self.plan, VERSION_1),
            &self.follower.pubkey(),
            nonce,
        )
    }

    fn send(&mut self, ixs: &[Instruction]) -> Sent {
        let f = self.follower.insecure_clone();
        self.env.send(ixs, &f, &[&f])
    }

    /// The happy-path transaction: begin, one swap, finish.
    fn follow(&mut self, nonce: u64, amount_in: u64, amount_out: u64) -> Sent {
        let ixs = [
            self.begin(nonce, USDC_100 * 10),
            self.swap(amount_in, amount_out),
            self.finish(nonce),
        ];
        self.send(&ixs)
    }

    fn assert_no_receipt(&self, nonce: u64) {
        assert!(
            self.env.svm.get_account(&self.receipt_key(nonce)).is_none(),
            "a failed follow must leave no receipt"
        );
    }
}

// ------------------------------------------------------------------ the receipt records facts

#[test]
fn an_in_range_swap_records_a_receipt_from_observed_balances() {
    let mut w = World::new();
    w.follow(1, USDC_100, SOL_AT_183).expect("follow");

    let r: FollowReceipt = w.env.read(&w.receipt_key(1));
    assert_eq!(r.status, ReceiptStatus::Recorded);
    assert_eq!(r.plan, w.plan);
    assert_eq!(r.version, 1);
    assert_eq!(r.follower, w.follower.pubkey());
    assert_eq!((r.pre_quote, r.pre_base), (1_000_000_000, 0));
    assert_eq!((r.quote_spent, r.base_received), (USDC_100, SOL_AT_183));
    assert_eq!(r.max_quote_in, USDC_100 * 10);
    assert_eq!(r.recorded_at, T0);

    let f = w.follower.pubkey();
    assert_eq!(
        w.env.token_amount(&ata(&f, &USDC_MINT)),
        1_000_000_000 - USDC_100
    );
    assert_eq!(w.env.token_amount(&ata(&f, &WSOL_MINT)), SOL_AT_183);
}

#[test]
fn the_receipt_account_has_the_documented_size() {
    let mut w = World::new();
    w.follow(1, USDC_100, SOL_AT_183).unwrap();
    assert_eq!(w.env.raw(&w.receipt_key(1)).len(), 8 + 132);
}

#[test]
fn one_follower_can_record_several_receipts_with_different_nonces_but_not_reuse_one() {
    let mut w = World::new();
    w.follow(1, USDC_100, SOL_AT_183).unwrap();
    w.follow(2, USDC_100, SOL_AT_183).expect("second nonce");
    assert!(
        w.follow(1, USDC_100, SOL_AT_183).is_err(),
        "nonce reuse must fail"
    );
    let r2: FollowReceipt = w.env.read(&w.receipt_key(2));
    assert_eq!(
        r2.pre_base, SOL_AT_183,
        "second receipt snapshots the balance after the first"
    );
}

// --------------------------------------------------------------------------- the price range

#[test]
fn a_price_above_the_range_reverts_everything() {
    let mut w = World::new();
    // 100 USDC for 0.5 SOL is $200 per SOL.
    assert_fails_with(
        w.follow(1, USDC_100, 500_000_000),
        "Error Code: PriceAboveRange",
    );
    w.assert_no_receipt(1);
    let f = w.follower.pubkey();
    assert_eq!(
        w.env.token_amount(&ata(&f, &USDC_MINT)),
        1_000_000_000,
        "the swap reverted with it"
    );
}

#[test]
fn a_price_below_the_range_is_rejected_with_its_own_error() {
    let mut w = World::new();
    // 100 USDC for ~0.667 SOL is $150 per SOL.
    assert_fails_with(
        w.follow(1, USDC_100, 666_666_667),
        "Error Code: PriceBelowRange",
    );
    w.assert_no_receipt(1);
}

#[test]
fn the_range_boundaries_are_exact_and_inclusive() {
    let mut w = World::new();
    // Exactly $185 and exactly $180 per SOL are in range.
    w.follow(1, 92_500_000, 500_000_000)
        .expect("exactly the high bound");
    w.follow(2, 90_000_000, 500_000_000)
        .expect("exactly the low bound");
    // One lamport less SOL pushes the price strictly above $185.
    assert_fails_with(
        w.follow(3, 92_500_000, 499_999_999),
        "Error Code: PriceAboveRange",
    );
    // One lamport more SOL pushes the price strictly below $180.
    assert_fails_with(
        w.follow(4, 90_000_000, 500_000_001),
        "Error Code: PriceBelowRange",
    );
}

#[test]
fn no_output_or_no_input_is_never_a_receipt() {
    let mut w = World::new();
    assert_fails_with(w.follow(1, USDC_100, 0), "Error Code: NoOutputReceived");
    assert_fails_with(w.follow(2, 0, SOL_AT_183), "Error Code: NoInputSpent");
    w.assert_no_receipt(1);
    w.assert_no_receipt(2);
}

#[test]
fn the_swap_cannot_spend_more_than_the_follower_approved() {
    let mut w = World::new();
    let ixs = [
        w.begin(1, 50_000_000),
        w.swap(USDC_100, SOL_AT_183),
        w.finish(1),
    ];
    assert_fails_with(w.send(&ixs), "Error Code: InputAboveMax");
    let ixs = [w.begin(1, 0), w.swap(USDC_100, SOL_AT_183), w.finish(1)];
    assert_fails_with(w.send(&ixs), "Error Code: InvalidAmount");
}

// ---------------------------------------------------------------- plan state at follow time

#[test]
fn expiry_is_exclusive_at_the_exact_second() {
    let mut w = World::new();
    let expires = Terms::standard().expires_at;
    w.env.set_time(expires - 1);
    w.follow(1, USDC_100, SOL_AT_183)
        .expect("one second before expiry");
    w.env.set_time(expires);
    assert_fails_with(w.follow(2, USDC_100, SOL_AT_183), "Error Code: PlanExpired");
    w.assert_no_receipt(2);
}

#[test]
fn a_review_of_an_older_version_fails_after_the_plan_is_revised() {
    let mut w = World::new();
    let creator = w.env.creator.insecure_clone();
    let ix = revise_plan_ix(
        &creator.pubkey(),
        &w.plan,
        1,
        2,
        Terms {
            content_hash: [9u8; 32],
            ..Terms::standard()
        },
    );
    w.env.send(&[ix], &creator, &[&creator]).unwrap();
    assert_fails_with(
        w.follow(1, USDC_100, SOL_AT_183),
        "Error Code: StaleVersion",
    );
    // Following the latest version works.
    let ixs = [
        begin_follow_ix(
            &w.follower.pubkey(),
            &w.plan,
            2,
            1,
            USDC_100 * 10,
            &WSOL_MINT,
            &USDC_MINT,
        ),
        w.swap(USDC_100, SOL_AT_183),
        finish_follow_ix(&w.follower.pubkey(), &w.plan, 2, 1, &WSOL_MINT, &USDC_MINT),
    ];
    w.send(&ixs).expect("latest version");
}

#[test]
fn a_closed_plan_cannot_be_followed() {
    let mut w = World::new();
    let creator = w.env.creator.insecure_clone();
    w.env
        .send(
            &[close_plan_ix(&creator.pubkey(), &w.plan)],
            &creator,
            &[&creator],
        )
        .unwrap();
    assert_fails_with(w.follow(1, USDC_100, SOL_AT_183), "Error Code: PlanClosed");
}

// --------------------------------------------------- the transaction layout (anti-forgery)

#[test]
fn begin_without_finish_is_rejected() {
    let mut w = World::new();
    let ixs = [w.begin(1, USDC_100 * 10), w.swap(USDC_100, SOL_AT_183)];
    assert_fails_with(w.send(&ixs), "Error Code: InvalidInstructionLayout");
    w.assert_no_receipt(1);
}

#[test]
fn finish_without_begin_is_rejected() {
    let mut w = World::new();
    let ixs = [w.swap(USDC_100, SOL_AT_183), w.finish(1)];
    assert!(w.send(&ixs).is_err());
    w.assert_no_receipt(1);
}

#[test]
fn a_plain_token_transfer_between_the_snapshots_cannot_fake_a_buy() {
    let mut w = World::new();
    let f = w.follower.pubkey();
    // The follower pays USDC away and "receives" SOL from a wallet they control: no swap at all.
    let pay = spl_token::instruction::transfer(
        &anchor_spl::token::ID,
        &ata(&f, &USDC_MINT),
        &w.pool_quote,
        &f,
        &[],
        USDC_100,
    )
    .unwrap();
    let ixs = [w.begin(1, USDC_100 * 10), pay, w.finish(1)];
    assert_fails_with(
        w.send(&ixs),
        "Error Code: UnexpectedInstructionBetweenSnapshots",
    );
    w.assert_no_receipt(1);
}

#[test]
fn two_swaps_between_the_snapshots_are_rejected_the_second_wallet_attack() {
    let mut w = World::new();
    let attacker = w.env.funded();
    w.env.set_token(
        ata(&attacker.pubkey(), &USDC_MINT),
        &USDC_MINT,
        &attacker.pubkey(),
        1_000_000_000,
    );
    w.env.set_token(
        ata(&attacker.pubkey(), &WSOL_MINT),
        &WSOL_MINT,
        &attacker.pubkey(),
        0,
    );
    let f = w.follower.pubkey();
    // The attacker "buys" SOL straight into the follower's account at a bargain price, while the
    // follower's own swap goes to the attacker. The follower's net change looks like an in-range buy.
    let a = attacker.pubkey();
    let into_follower = mock_swap_ix(
        &a,
        &ata(&a, &USDC_MINT),
        &ata(&f, &WSOL_MINT),
        &w.pool_quote,
        &w.pool_base,
        1,
        SOL_AT_183,
    );
    let out_to_attacker = mock_swap_ix(
        &f,
        &ata(&f, &USDC_MINT),
        &ata(&a, &WSOL_MINT),
        &w.pool_quote,
        &w.pool_base,
        USDC_100,
        1,
    );
    let ixs = [
        w.begin(1, USDC_100 * 10),
        into_follower,
        out_to_attacker,
        w.finish(1),
    ];
    let follower = w.follower.insecure_clone();
    assert_fails_with(
        w.env.send(&ixs, &follower, &[&follower, &attacker]),
        "Error Code: InvalidInstructionLayout",
    );
    w.assert_no_receipt(1);
}

#[test]
fn a_swap_with_an_extra_signer_is_rejected() {
    let mut w = World::new();
    let attacker = w.env.funded();
    let f = w.follower.pubkey();
    // The swap is signed by the attacker as well as the follower: someone else controls the fill.
    let mut swap = w.swap(USDC_100, SOL_AT_183);
    swap.accounts
        .push(AccountMeta::new_readonly(attacker.pubkey(), true));
    let ixs = [w.begin(1, USDC_100 * 10), swap, w.finish(1)];
    let follower = w.follower.insecure_clone();
    let _ = f;
    assert_fails_with(
        w.env.send(&ixs, &follower, &[&follower, &attacker]),
        "Error Code: UnexpectedInstructionBetweenSnapshots",
    );
}

#[test]
fn a_swap_that_does_not_touch_the_followers_accounts_is_rejected() {
    let mut w = World::new();
    let other = w.env.funded();
    let o = other.pubkey();
    w.env
        .set_token(ata(&o, &USDC_MINT), &USDC_MINT, &o, 1_000_000_000);
    w.env.set_token(ata(&o, &WSOL_MINT), &WSOL_MINT, &o, 0);
    // A swap between someone else's accounts, signed by the follower (who is the fee payer).
    let unrelated = mock_swap_ix(
        &o,
        &ata(&o, &USDC_MINT),
        &ata(&o, &WSOL_MINT),
        &w.pool_quote,
        &w.pool_base,
        USDC_100,
        SOL_AT_183,
    );
    let ixs = [w.begin(1, USDC_100 * 10), unrelated, w.finish(1)];
    let follower = w.follower.insecure_clone();
    assert_fails_with(
        w.env.send(&ixs, &follower, &[&follower, &other]),
        "Error Code: UnexpectedInstructionBetweenSnapshots",
    );
}

#[test]
fn finish_must_come_exactly_two_instructions_after_begin() {
    let mut w = World::new();
    let f = w.follower.pubkey();
    let filler = system_instruction::transfer(&f, &Pubkey::new_unique(), 1);
    let ixs = [
        w.begin(1, USDC_100 * 10),
        w.swap(USDC_100, SOL_AT_183),
        filler,
        w.finish(1),
    ];
    assert_fails_with(w.send(&ixs), "Error Code: InvalidInstructionLayout");
}

#[test]
fn two_follow_pairs_in_one_transaction_are_rejected() {
    let mut w = World::new();
    let ixs = [
        w.begin(1, USDC_100 * 10),
        w.swap(USDC_100, SOL_AT_183),
        w.finish(1),
        w.begin(2, USDC_100 * 10),
        w.swap(USDC_100, SOL_AT_183),
        w.finish(2),
    ];
    assert_fails_with(w.send(&ixs), "Error Code: InvalidInstructionLayout");
}

#[test]
fn begin_called_through_another_program_is_rejected() {
    let mut w = World::new();
    let attacker_program = Pubkey::new_unique();
    w.env.load_test_program(attacker_program, "cpi_attacker.so");
    let inner = w.begin(1, USDC_100 * 10);
    // The attacker program forwards relay's begin_follow via CPI. The follower signs the tx.
    let mut accounts = vec![AccountMeta::new_readonly(relay::id(), false)];
    accounts.extend(inner.accounts.clone());
    let wrapped = Instruction {
        program_id: attacker_program,
        accounts,
        data: inner.data.clone(),
    };
    let ixs = [wrapped, w.swap(USDC_100, SOL_AT_183), w.finish(1)];
    assert_fails_with(w.send(&ixs), "Error Code: CpiNotAllowed");
    w.assert_no_receipt(1);
}

// ------------------------------------------------------------------------- account checks

#[test]
fn token_accounts_must_be_the_followers_associated_accounts() {
    let mut w = World::new();
    let f = w.follower.pubkey();
    // A token account the follower owns, but not at the canonical associated address.
    let off_curve = Pubkey::new_unique();
    w.env.set_token(off_curve, &WSOL_MINT, &f, 0);
    let mut begin = w.begin(1, USDC_100 * 10);
    for m in begin.accounts.iter_mut() {
        if m.pubkey == ata(&f, &WSOL_MINT) {
            m.pubkey = off_curve;
        }
    }
    let ixs = [begin, w.swap(USDC_100, SOL_AT_183), w.finish(1)];
    assert_fails_with(w.send(&ixs), "Error Code: TokenAccountMismatch");
}

#[test]
fn a_recorded_receipt_cannot_be_finished_twice() {
    let mut w = World::new();
    w.follow(1, USDC_100, SOL_AT_183).unwrap();
    assert_fails_with(w.send(&[w.finish(1)]), "Error Code: ReceiptNotPending");
}

#[test]
fn someone_else_cannot_finish_a_followers_receipt() {
    let mut w = World::new();
    let ixs = [w.begin(1, USDC_100 * 10), w.swap(USDC_100, SOL_AT_183)];
    // Build the pair, but have a different signer try to complete it with the real receipt.
    let mallory = w.env.funded();
    let m = mallory.pubkey();
    w.env.set_token(ata(&m, &USDC_MINT), &USDC_MINT, &m, 0);
    w.env.set_token(ata(&m, &WSOL_MINT), &WSOL_MINT, &m, 0);
    let mut finish = finish_follow_ix(&m, &w.plan, VERSION_1, 1, &WSOL_MINT, &USDC_MINT);
    for meta in finish.accounts.iter_mut() {
        if meta.pubkey == receipt_pda(&version_pda(&w.plan, VERSION_1), &m, 1) {
            meta.pubkey = w.receipt_key(1);
        }
    }
    let all = [ixs[0].clone(), ixs[1].clone(), finish];
    let follower = w.follower.insecure_clone();
    assert!(w.env.send(&all, &follower, &[&follower, &mallory]).is_err());
}

#[test]
fn begin_and_finish_instruction_data_use_the_expected_discriminators() {
    // Guards the layout checks, which match on instruction data prefixes.
    use anchor_lang::Discriminator;
    let begin = relay::instruction::BeginFollow {
        version: 1,
        nonce: 1,
        max_quote_in: 1,
    }
    .data();
    assert!(begin.starts_with(relay::instruction::BeginFollow::DISCRIMINATOR));
    let finish = relay::instruction::FinishFollow {}.data();
    assert!(finish.starts_with(relay::instruction::FinishFollow::DISCRIMINATOR));
    assert_ne!(
        relay::instruction::BeginFollow::DISCRIMINATOR,
        relay::instruction::FinishFollow::DISCRIMINATOR
    );
}
