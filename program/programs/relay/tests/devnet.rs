#![cfg(feature = "devnet")]
//! The devnet build of Relay (`--features devnet`) against the simulated swap venue.
//!
//! Needs two extra programs built first, which the Anchor.toml `test` script does:
//!   target/deploy-devnet/relay.so       relay built with `--features devnet`
//!   target/deploy/simulated_venue.so    the venue (programs/simulated_venue)
//!
//! It proves, on the real SBF binaries: a follow routed through the venue records a receipt; the
//! program's range check judges the price the venue actually gave (not the one anyone claims); the
//! old Jupiter route and the JUP pair are refused on devnet; and the venue's own rules (admin only,
//! the user's own token accounts, no second signer) hold.

mod common;

use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{
            instruction::{AccountMeta, Instruction},
            system_program,
        },
    },
    anchor_spl::token::spl_token,
    common::*,
    relay::state::{FollowReceipt, ReceiptStatus},
    solana_keypair::Keypair,
    solana_signer::Signer,
};

const VERSION_1: u16 = 1;
const USDC_100: u64 = 100_000_000;
/// The venue's price while the plan is open: $183 per SOL, inside the standard $180-$185 range.
const PRICE_183: u64 = 183_000_000;
/// What 100 USDC buys at $183 per SOL (floored): 546.448087 million lamports.
const SOL_AT_183: u64 = 546_448_087;

// --------------------------------------------------------------------- the venue, by its bytes

fn venue_id() -> Pubkey {
    relay::VENUE_PROGRAM_ID
}

/// `["pool", admin, base_mint, quote_mint]` under the venue program.
fn pool_pda(admin: &Pubkey, base: &Pubkey, quote: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"pool", admin.as_ref(), base.as_ref(), quote.as_ref()],
        &venue_id(),
    )
    .0
}

fn init_pool_ix(admin: &Pubkey, price: u64) -> Instruction {
    let mut data = vec![0u8];
    data.extend_from_slice(&price.to_le_bytes());
    Instruction {
        program_id: venue_id(),
        accounts: vec![
            AccountMeta::new(*admin, true),
            AccountMeta::new(pool_pda(admin, &WSOL_MINT, &USDC_MINT), false),
            AccountMeta::new_readonly(WSOL_MINT, false),
            AccountMeta::new_readonly(USDC_MINT, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data,
    }
}

fn set_price_ix(admin: &Pubkey, pool: &Pubkey, price: u64) -> Instruction {
    let mut data = vec![1u8];
    data.extend_from_slice(&price.to_le_bytes());
    Instruction {
        program_id: venue_id(),
        accounts: vec![
            AccountMeta::new_readonly(*admin, true),
            AccountMeta::new(*pool, false),
        ],
        data,
    }
}

/// The follower's swap, with the account order and flags the TypeScript client builds.
fn venue_swap_ix(user: &Pubkey, pool: &Pubkey, amount_in: u64, min_out: u64) -> Instruction {
    let mut data = vec![2u8];
    data.extend_from_slice(&amount_in.to_le_bytes());
    data.extend_from_slice(&min_out.to_le_bytes());
    Instruction {
        program_id: venue_id(),
        accounts: vec![
            AccountMeta::new(*user, true),
            AccountMeta::new(ata(user, &USDC_MINT), false),
            AccountMeta::new(ata(user, &WSOL_MINT), false),
            AccountMeta::new_readonly(*pool, false),
            AccountMeta::new(ata(pool, &USDC_MINT), false),
            AccountMeta::new(ata(pool, &WSOL_MINT), false),
            AccountMeta::new_readonly(spl_token::ID, false),
        ],
        data,
    }
}

// ------------------------------------------------------------------------------------- world

struct World {
    env: Env,
    admin: Keypair,
    follower: Keypair,
    plan: Pubkey,
    pool: Pubkey,
}

impl World {
    /// A SOL/USDC plan ($180-$185, one hour), a follower holding 1,000 USDC, and a funded venue
    /// pool created through the venue's own `init_pool` at $183.
    fn new() -> Self {
        let mut env = Env::new();
        env.load_test_program(venue_id(), "simulated_venue.so");
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

        let admin = env.funded();
        let ix = init_pool_ix(&admin.pubkey(), PRICE_183);
        env.send(&[ix], &admin, &[&admin]).expect("init_pool");
        let pool = pool_pda(&admin.pubkey(), &WSOL_MINT, &USDC_MINT);
        fund_vaults(&mut env, &pool);
        World {
            env,
            admin,
            follower,
            plan,
            pool,
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

    fn swap(&self, amount_in: u64, min_out: u64) -> Instruction {
        venue_swap_ix(&self.follower.pubkey(), &self.pool, amount_in, min_out)
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

    fn follow(&mut self, nonce: u64, amount_in: u64, min_out: u64) -> Sent {
        let ixs = [
            self.begin(nonce, USDC_100 * 10),
            self.swap(amount_in, min_out),
            self.finish(nonce),
        ];
        self.send(&ixs)
    }

    fn set_price(&mut self, price: u64) {
        let admin = self.admin.insecure_clone();
        let ix = set_price_ix(&admin.pubkey(), &self.pool, price);
        self.env.send(&[ix], &admin, &[&admin]).expect("set_price");
    }

    fn assert_no_receipt(&self, nonce: u64) {
        assert!(
            self.env.raw(&self.receipt_key(nonce)).is_empty(),
            "a failed follow must leave no receipt"
        );
    }
}

/// The venue's vaults are the pool's associated token accounts, funded by plain transfers (here,
/// by writing the token accounts directly).
fn fund_vaults(env: &mut Env, pool: &Pubkey) {
    env.set_token(ata(pool, &USDC_MINT), &USDC_MINT, pool, 0);
    env.set_token(
        ata(pool, &WSOL_MINT),
        &WSOL_MINT,
        pool,
        1_000_000_000_000_000,
    );
}

// --------------------------------------------------------------------------------- following

#[test]
fn a_follow_through_the_venue_records_a_receipt_for_what_really_happened() {
    let mut w = World::new();
    let f = w.follower.pubkey();
    w.follow(1, USDC_100, SOL_AT_183).expect("follow");

    let receipt: FollowReceipt = w.env.read(&w.receipt_key(1));
    assert_eq!(receipt.status, ReceiptStatus::Recorded);
    assert_eq!(receipt.quote_spent, USDC_100);
    assert_eq!(receipt.base_received, SOL_AT_183);
    assert_eq!(receipt.follower, f);
    // Balances moved exactly once, through the pool's vaults.
    assert_eq!(
        w.env.token_amount(&ata(&f, &USDC_MINT)),
        1_000_000_000 - USDC_100
    );
    assert_eq!(w.env.token_amount(&ata(&f, &WSOL_MINT)), SOL_AT_183);
    assert_eq!(w.env.token_amount(&ata(&w.pool, &USDC_MINT)), USDC_100);
}

#[test]
fn the_range_check_judges_the_price_the_venue_actually_gave() {
    // The venue's admin raises the price above the plan's range (190 > 185): the swap itself
    // works, and finish_follow refuses to record it. No receipt, and the whole transaction reverts.
    let mut w = World::new();
    w.set_price(190_000_000);
    let out = USDC_100 * 1_000_000_000 / 190_000_000;
    assert_fails_with(w.follow(1, USDC_100, out), "PriceAboveRange");
    w.assert_no_receipt(1);
    let f = w.follower.pubkey();
    assert_eq!(w.env.token_amount(&ata(&f, &USDC_MINT)), 1_000_000_000);
    assert_eq!(w.env.token_amount(&ata(&f, &WSOL_MINT)), 0);

    // And below the range (170 < 180).
    w.set_price(170_000_000);
    let out = USDC_100 * 1_000_000_000 / 170_000_000;
    assert_fails_with(w.follow(2, USDC_100, out), "PriceBelowRange");
    w.assert_no_receipt(2);
}

#[test]
fn a_price_that_moves_after_the_quote_fails_the_swap_and_spends_nothing() {
    // The follower reviewed 546,448,087 lamports for 100 USDC. The admin lowers the amount the
    // pool pays (higher price) before the transaction lands: the venue refuses, nothing moves.
    let mut w = World::new();
    w.set_price(184_000_000);
    assert_fails_with(
        w.follow(1, USDC_100, SOL_AT_183),
        "custom program error: 0xd",
    );
    w.assert_no_receipt(1);
    let f = w.follower.pubkey();
    assert_eq!(w.env.token_amount(&ata(&f, &USDC_MINT)), 1_000_000_000);
}

#[test]
fn a_plan_that_has_expired_still_fails_on_devnet() {
    let mut w = World::new();
    w.env.set_time(T0 + 2 * HOUR);
    assert_fails_with(w.follow(1, USDC_100, SOL_AT_183), "PlanExpired");
    w.assert_no_receipt(1);
}

// ---------------------------------------------------------------- what devnet does not accept

#[test]
fn jupiters_program_is_not_an_allowed_swap_on_devnet() {
    let mut w = World::new();
    // A swap-shaped instruction at Jupiter's id (the old mock) sits between begin and finish.
    w.env.load_test_program(jupiter_id(), "mock_swap.so");
    let f = w.follower.pubkey();
    let pool_quote = Pubkey::new_unique();
    let pool_base = Pubkey::new_unique();
    w.env
        .set_token(pool_quote, &USDC_MINT, &pool_authority(), 0);
    w.env.set_token(
        pool_base,
        &WSOL_MINT,
        &pool_authority(),
        1_000_000_000_000_000,
    );
    let swap = mock_swap_ix(
        &f,
        &ata(&f, &USDC_MINT),
        &ata(&f, &WSOL_MINT),
        &pool_quote,
        &pool_base,
        USDC_100,
        SOL_AT_183,
    );
    let ixs = [w.begin(1, USDC_100), swap, w.finish(1)];
    assert_fails_with(w.send(&ixs), "UnexpectedInstructionBetweenSnapshots");
    w.assert_no_receipt(1);
}

#[test]
fn only_the_sol_usdc_pair_with_devnet_usdc_can_be_published() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    // The mainnet USDC mint is a perfectly good mint account, but not this network's token.
    let mainnet_usdc: Pubkey = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        .parse()
        .unwrap();
    let acc = mint_account(&env.svm, 6);
    env.svm.set_account(mainnet_usdc, acc).unwrap();
    let ix = create_plan_ix(
        &creator.pubkey(),
        7,
        Terms::standard(),
        WSOL_MINT,
        mainnet_usdc,
    );
    assert_fails_with(env.send(&[ix], &creator, &[&creator]), "PairNotSupported");
    // A made-up base token against devnet USDC is refused too.
    let other = Pubkey::new_unique();
    let acc = mint_account(&env.svm, 6);
    env.svm.set_account(other, acc).unwrap();
    let ix = create_plan_ix(&creator.pubkey(), 8, Terms::standard(), other, USDC_MINT);
    assert_fails_with(env.send(&[ix], &creator, &[&creator]), "PairNotSupported");
    // The supported pair works.
    let ix = create_plan_ix(
        &creator.pubkey(),
        9,
        Terms::standard(),
        WSOL_MINT,
        USDC_MINT,
    );
    env.send(&[ix], &creator, &[&creator]).expect("SOL/USDC");
}

// ------------------------------------------------------- the anti-forgery rules, via the venue

#[test]
fn a_second_signer_on_the_venue_swap_is_refused() {
    let mut w = World::new();
    let accomplice = w.env.funded();
    let mut swap = w.swap(USDC_100, SOL_AT_183);
    swap.accounts
        .push(AccountMeta::new_readonly(accomplice.pubkey(), true));
    let ixs = [w.begin(1, USDC_100), swap, w.finish(1)];
    let f = w.follower.insecure_clone();
    let res = w.env.send(&ixs, &f, &[&f, &accomplice]);
    assert_fails_with(res, "UnexpectedInstructionBetweenSnapshots");
    w.assert_no_receipt(1);
}

#[test]
fn two_venue_swaps_between_the_snapshots_are_refused() {
    let mut w = World::new();
    let ixs = [
        w.begin(1, USDC_100 * 2),
        w.swap(USDC_100, SOL_AT_183),
        w.swap(USDC_100, SOL_AT_183),
        w.finish(1),
    ];
    assert_fails_with(w.send(&ixs), "InvalidInstructionLayout");
    w.assert_no_receipt(1);
}

#[test]
fn a_venue_swap_without_the_snapshots_records_nothing() {
    let mut w = World::new();
    let ixs = [w.swap(USDC_100, SOL_AT_183)];
    w.send(&ixs).expect("the venue itself will swap");
    // The tokens moved, but Relay was not part of the transaction, so there is no receipt.
    let f = w.follower.pubkey();
    assert_eq!(w.env.token_amount(&ata(&f, &WSOL_MINT)), SOL_AT_183);
    w.assert_no_receipt(1);
}

// ------------------------------------------------------------------------------ the venue's rules

#[test]
fn the_venue_swaps_only_the_users_own_token_accounts() {
    let mut w = World::new();
    let stranger = Pubkey::new_unique();
    let stranger_usdc = Pubkey::new_unique();
    w.env
        .set_token(stranger_usdc, &USDC_MINT, &stranger, USDC_100);
    let mut swap = w.swap(USDC_100, SOL_AT_183);
    swap.accounts[1] = AccountMeta::new(stranger_usdc, false); // someone else's USDC
                                                               // Custom error 10 = WrongTokenAccount.
    assert_fails_with(w.send(&[swap]), "custom program error: 0xa");
    assert_eq!(w.env.token_amount(&stranger_usdc), USDC_100);
}

#[test]
fn only_the_pool_admin_can_change_its_price() {
    let mut w = World::new();
    let attacker = w.env.funded();
    let ix = set_price_ix(&attacker.pubkey(), &w.pool, 1);
    // Custom error 6 = NotAdmin.
    assert_fails_with(
        w.env.send(&[ix], &attacker, &[&attacker]),
        "custom program error: 0x6",
    );
    // The price is unchanged: a follow at $183 still records.
    w.follow(1, USDC_100, SOL_AT_183).expect("follow");
}

#[test]
fn a_pool_cannot_be_created_twice_and_a_prefunded_address_still_works() {
    let mut w = World::new();
    let admin = w.admin.insecure_clone();
    let again = init_pool_ix(&admin.pubkey(), 1);
    // Custom error 5 = PoolExists.
    assert_fails_with(
        w.env.send(&[again], &admin, &[&admin]),
        "custom program error: 0x5",
    );

    // Someone sends lamports to a pool's address before it exists: create_account would refuse
    // it, the venue tops up, sizes and assigns it instead.
    let other_admin = w.env.funded();
    let pool = pool_pda(&other_admin.pubkey(), &WSOL_MINT, &USDC_MINT);
    w.env.svm.airdrop(&pool, 1).unwrap();
    let ix = init_pool_ix(&other_admin.pubkey(), PRICE_183);
    w.env
        .send(&[ix], &other_admin, &[&other_admin])
        .expect("init_pool at a prefunded address");
    assert_eq!(w.env.raw(&pool).len(), 108);
}

#[test]
fn a_pool_of_someone_elses_still_cannot_forge_an_out_of_range_receipt() {
    // Anyone can create a pool, but Relay judges the price the pool really gave.
    let mut w = World::new();
    let rival = w.env.funded();
    let ix = init_pool_ix(&rival.pubkey(), 100_000_000); // $100: far below the plan's $180-$185
    w.env.send(&[ix], &rival, &[&rival]).expect("rival pool");
    let rival_pool = pool_pda(&rival.pubkey(), &WSOL_MINT, &USDC_MINT);
    fund_vaults(&mut w.env, &rival_pool);
    let out = USDC_100 * 1_000_000_000 / 100_000_000;
    let ixs = [
        w.begin(1, USDC_100),
        venue_swap_ix(&w.follower.pubkey(), &rival_pool, USDC_100, out),
        w.finish(1),
    ];
    assert_fails_with(w.send(&ixs), "PriceBelowRange");
    w.assert_no_receipt(1);
}

#[test]
fn staging_an_in_range_fill_through_ones_own_pool_is_the_known_limitation() {
    // Plan section S: the on-chain range check cannot tell a market price from a price a user set
    // in a pool of their own. The server compares each receipt with the reference price at that
    // slot and flags and excludes outliers (package W6). This test records that the limitation is
    // real, so nobody mistakes the receipt for proof of a market fill.
    let mut w = World::new();
    let rival = w.env.funded();
    let ix = init_pool_ix(&rival.pubkey(), 182_000_000); // "in range" whatever the market says
    w.env.send(&[ix], &rival, &[&rival]).expect("own pool");
    let own_pool = pool_pda(&rival.pubkey(), &WSOL_MINT, &USDC_MINT);
    fund_vaults(&mut w.env, &own_pool);
    let out = USDC_100 * 1_000_000_000 / 182_000_000;
    let ixs = [
        w.begin(1, USDC_100),
        venue_swap_ix(&w.follower.pubkey(), &own_pool, USDC_100, out),
        w.finish(1),
    ];
    w.send(&ixs).expect("records, as documented");
    let receipt: FollowReceipt = w.env.read(&w.receipt_key(1));
    assert_eq!(receipt.status, ReceiptStatus::Recorded);
}
