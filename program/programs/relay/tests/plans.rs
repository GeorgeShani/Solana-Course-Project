mod common;

use {
    anchor_lang::{prelude::Pubkey, solana_program::instruction::AccountMeta},
    common::*,
    relay::{
        commitment::{compute_terms_hash, TermsInput},
        state::{Plan, PlanStatus, PlanVersion},
    },
    solana_signer::Signer,
};

fn terms_input(env: &Env, plan: Pubkey, version: u16, t: Terms, prev: [u8; 32]) -> TermsInput {
    TermsInput {
        program_id: relay::id(),
        plan,
        version,
        creator: env.creator.pubkey(),
        base_mint: WSOL_MINT,
        quote_mint: USDC_MINT,
        base_decimals: 9,
        quote_decimals: 6,
        entry_low: t.low,
        entry_high: t.high,
        expires_at: t.expires_at,
        content_hash: t.content_hash,
        prev_terms_hash: prev,
    }
}

/// Creates plan #1 with the standard terms and returns its PDA.
fn create_standard(env: &mut Env) -> Pubkey {
    let creator = env.creator.insecure_clone();
    let ix = create_plan_ix(
        &creator.pubkey(),
        1,
        Terms::standard(),
        WSOL_MINT,
        USDC_MINT,
    );
    env.send(&[ix], &creator, &[&creator]).expect("create_plan");
    plan_pda(&creator.pubkey(), 1)
}

// ---------------------------------------------------------------- create_plan

#[test]
fn create_plan_stores_terms_and_an_onchain_hash_that_matches_the_host_function() {
    let mut env = Env::new();
    let plan_key = create_standard(&mut env);
    let t = Terms::standard();

    let plan: Plan = env.read(&plan_key);
    assert_eq!(plan.creator, env.creator.pubkey());
    assert_eq!(plan.plan_id, 1);
    assert_eq!((plan.base_mint, plan.quote_mint), (WSOL_MINT, USDC_MINT));
    assert_eq!((plan.base_decimals, plan.quote_decimals), (9, 6));
    assert_eq!(plan.latest_version, 1);
    assert_eq!(plan.status, PlanStatus::Open);
    assert_eq!(plan.created_at, T0);

    let v: PlanVersion = env.read(&version_pda(&plan_key, 1));
    assert_eq!(v.plan, plan_key);
    assert_eq!(v.version, 1);
    assert_eq!(
        (v.entry_low, v.entry_high, v.expires_at),
        (t.low, t.high, t.expires_at)
    );
    assert_eq!(v.published_at, T0);
    assert_eq!(v.content_hash, t.content_hash);
    assert_eq!(v.prev_terms_hash, [0u8; 32]);
    assert_eq!(
        v.terms_hash,
        compute_terms_hash(&terms_input(&env, plan_key, 1, t, [0u8; 32]))
    );
}

#[test]
fn accounts_have_the_documented_sizes() {
    let mut env = Env::new();
    let plan_key = create_standard(&mut env);
    assert_eq!(env.raw(&plan_key).len(), 8 + 118);
    assert_eq!(env.raw(&version_pda(&plan_key, 1)).len(), 8 + 171);
}

#[test]
fn both_supported_pairs_work() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    let ix = create_plan_ix(
        &creator.pubkey(),
        2,
        Terms {
            low: 300_000,
            high: 400_000,
            ..Terms::standard()
        },
        JUP_MINT,
        USDC_MINT,
    );
    env.send(&[ix], &creator, &[&creator]).expect("JUP/USDC");
    let plan: Plan = env.read(&plan_pda(&creator.pubkey(), 2));
    assert_eq!((plan.base_mint, plan.base_decimals), (JUP_MINT, 6));
}

#[test]
fn unsupported_pairs_are_rejected() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    let other_mint = Pubkey::new_unique();
    let acc = mint_account(&env.svm, 6);
    env.svm.set_account(other_mint, acc).unwrap();

    for (base, quote) in [
        (USDC_MINT, WSOL_MINT),  // reversed
        (JUP_MINT, WSOL_MINT),   // quote not USDC
        (other_mint, USDC_MINT), // unknown base token
        (USDC_MINT, USDC_MINT),  // same token on both sides
        (WSOL_MINT, other_mint), // unknown quote
    ] {
        let ix = create_plan_ix(&creator.pubkey(), 9, Terms::standard(), base, quote);
        assert_fails_with(
            env.send(&[ix], &creator, &[&creator]),
            "Error Code: PairNotSupported",
        );
    }
}

#[test]
fn a_mint_not_owned_by_the_classic_token_program_is_rejected() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    // Same address as USDC but owned by the system program: not a mint at all.
    let mut acc = mint_account(&env.svm, 6);
    acc.owner = anchor_lang::solana_program::system_program::ID;
    env.svm.set_account(USDC_MINT, acc).unwrap();
    let ix = create_plan_ix(
        &creator.pubkey(),
        1,
        Terms::standard(),
        WSOL_MINT,
        USDC_MINT,
    );
    assert_fails_with(
        env.send(&[ix], &creator, &[&creator]),
        "AccountOwnedByWrongProgram",
    );
}

#[test]
fn entry_bounds_must_satisfy_zero_lt_low_le_high() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    for (low, high) in [(0, 185_000_000), (186_000_000, 185_000_000), (0, 0)] {
        let t = Terms {
            low,
            high,
            ..Terms::standard()
        };
        let ix = create_plan_ix(&creator.pubkey(), 1, t, WSOL_MINT, USDC_MINT);
        assert_fails_with(
            env.send(&[ix], &creator, &[&creator]),
            "Error Code: InvalidBounds",
        );
    }
    // A single-price range (low == high) is allowed.
    let t = Terms {
        low: 183_000_000,
        high: 183_000_000,
        ..Terms::standard()
    };
    let ix = create_plan_ix(&creator.pubkey(), 1, t, WSOL_MINT, USDC_MINT);
    env.send(&[ix], &creator, &[&creator])
        .expect("single-price range");
}

#[test]
fn the_window_must_be_between_one_minute_and_seven_days_with_exact_boundaries() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    let try_expiry = |env: &mut Env, id: u64, expires_at: i64| {
        let t = Terms {
            expires_at,
            ..Terms::standard()
        };
        let ix = create_plan_ix(&creator.pubkey(), id, t, WSOL_MINT, USDC_MINT);
        env.send(&[ix], &creator, &[&creator])
    };
    assert_fails_with(
        try_expiry(&mut env, 1, T0 + 59),
        "Error Code: InvalidWindow",
    );
    assert_fails_with(try_expiry(&mut env, 1, T0), "Error Code: InvalidWindow");
    assert_fails_with(try_expiry(&mut env, 1, T0 - 1), "Error Code: InvalidWindow");
    try_expiry(&mut env, 2, T0 + 60).expect("exactly 1 minute");
    try_expiry(&mut env, 3, T0 + 7 * DAY).expect("exactly 7 days");
    assert_fails_with(
        try_expiry(&mut env, 4, T0 + 7 * DAY + 1),
        "Error Code: InvalidWindow",
    );
    assert_fails_with(
        try_expiry(&mut env, 4, i64::MAX),
        "Error Code: InvalidWindow",
    );
}

#[test]
fn the_creator_must_sign() {
    let mut env = Env::new();
    let payer = env.funded();
    let creator_pk = env.creator.pubkey();
    let mut ix = create_plan_ix(&creator_pk, 1, Terms::standard(), WSOL_MINT, USDC_MINT);
    for meta in ix.accounts.iter_mut() {
        if meta.pubkey == creator_pk {
            *meta = AccountMeta::new(creator_pk, false); // present, writable, but not a signer
        }
    }
    assert_fails_with(env.send(&[ix], &payer, &[&payer]), "AccountNotSigner");
}

#[test]
fn a_plan_id_cannot_be_reused_by_the_same_creator() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    create_standard(&mut env);
    let ix = create_plan_ix(
        &creator.pubkey(),
        1,
        Terms {
            low: 100_000_000,
            ..Terms::standard()
        },
        WSOL_MINT,
        USDC_MINT,
    );
    assert!(env.send(&[ix], &creator, &[&creator]).is_err());
    // The original is untouched.
    let v: PlanVersion = env.read(&version_pda(&plan_pda(&creator.pubkey(), 1), 1));
    assert_eq!(v.entry_low, 180_000_000);
}

#[test]
fn two_creators_get_separate_plans_with_the_same_id() {
    let mut env = Env::new();
    let alice = env.creator.insecure_clone();
    let bob = env.funded();
    for kp in [&alice, &bob] {
        let ix = create_plan_ix(&kp.pubkey(), 1, Terms::standard(), WSOL_MINT, USDC_MINT);
        env.send(&[ix], kp, &[kp]).unwrap();
    }
    assert_ne!(plan_pda(&alice.pubkey(), 1), plan_pda(&bob.pubkey(), 1));
}

// ---------------------------------------------------------------- revise_plan

#[test]
fn revise_appends_a_chained_version_and_leaves_the_old_one_byte_identical() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    let plan_key = create_standard(&mut env);
    let v1_before = env.raw(&version_pda(&plan_key, 1));
    let v1: PlanVersion = env.read(&version_pda(&plan_key, 1));

    env.set_time(T0 + 20 * 60);
    let t2 = Terms {
        low: 180_000_000,
        high: 185_000_000,
        expires_at: T0 + 2 * HOUR,
        content_hash: [9u8; 32],
    };
    let ix = revise_plan_ix(&creator.pubkey(), &plan_key, 1, 2, t2);
    env.send(&[ix], &creator, &[&creator]).expect("revise");

    let plan: Plan = env.read(&plan_key);
    assert_eq!(plan.latest_version, 2);
    let v2: PlanVersion = env.read(&version_pda(&plan_key, 2));
    assert_eq!(v2.version, 2);
    assert_eq!(v2.published_at, T0 + 20 * 60);
    assert_eq!(v2.content_hash, [9u8; 32]);
    assert_eq!(v2.prev_terms_hash, v1.terms_hash);
    assert_eq!(
        v2.terms_hash,
        compute_terms_hash(&terms_input(&env, plan_key, 2, t2, v1.terms_hash))
    );
    assert_ne!(v2.terms_hash, v1.terms_hash);
    assert_eq!(
        env.raw(&version_pda(&plan_key, 1)),
        v1_before,
        "version 1 must never change"
    );
}

#[test]
fn only_the_creator_can_revise() {
    let mut env = Env::new();
    let plan_key = create_standard(&mut env);
    let mallory = env.funded();
    let ix = revise_plan_ix(&mallory.pubkey(), &plan_key, 1, 2, Terms::standard());
    assert_fails_with(env.send(&[ix], &mallory, &[&mallory]), "ConstraintHasOne");
    let plan: Plan = env.read(&plan_key);
    assert_eq!(plan.latest_version, 1);
}

#[test]
fn versions_cannot_be_skipped_repeated_or_chained_on_a_stale_parent() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    let plan_key = create_standard(&mut env);
    let t = Terms::standard();

    // Skip: latest is 1, so the new version must be 2, not 3.
    assert_fails_with(
        env.send(
            &[revise_plan_ix(&creator.pubkey(), &plan_key, 1, 3, t)],
            &creator,
            &[&creator],
        ),
        "ConstraintSeeds",
    );
    // Repeat: version 1 already exists and can't be re-initialized.
    assert_fails_with(
        env.send(
            &[revise_plan_ix(&creator.pubkey(), &plan_key, 1, 1, t)],
            &creator,
            &[&creator],
        ),
        "ConstraintSeeds",
    );

    env.send(
        &[revise_plan_ix(&creator.pubkey(), &plan_key, 1, 2, t)],
        &creator,
        &[&creator],
    )
    .expect("v2");
    // Stale parent: latest is 2, so chaining on version 1 is refused.
    assert_fails_with(
        env.send(
            &[revise_plan_ix(&creator.pubkey(), &plan_key, 1, 3, t)],
            &creator,
            &[&creator],
        ),
        "ConstraintSeeds",
    );
    // Re-init of version 2.
    assert_fails_with(
        env.send(
            &[revise_plan_ix(&creator.pubkey(), &plan_key, 2, 2, t)],
            &creator,
            &[&creator],
        ),
        "ConstraintSeeds",
    );
}

#[test]
fn revise_enforces_the_same_bounds_and_window_rules() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    let plan_key = create_standard(&mut env);
    let bad_bounds = Terms {
        low: 190_000_000,
        high: 185_000_000,
        ..Terms::standard()
    };
    assert_fails_with(
        env.send(
            &[revise_plan_ix(
                &creator.pubkey(),
                &plan_key,
                1,
                2,
                bad_bounds,
            )],
            &creator,
            &[&creator],
        ),
        "Error Code: InvalidBounds",
    );
    let bad_window = Terms {
        expires_at: T0 + 59,
        ..Terms::standard()
    };
    assert_fails_with(
        env.send(
            &[revise_plan_ix(
                &creator.pubkey(),
                &plan_key,
                1,
                2,
                bad_window,
            )],
            &creator,
            &[&creator],
        ),
        "Error Code: InvalidWindow",
    );
}

#[test]
fn a_plan_can_be_revised_after_it_expired_and_the_gap_is_visible_in_published_at() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    let plan_key = create_standard(&mut env);
    env.set_time(T0 + 3 * HOUR); // v1 expired at T0 + 1h
    let t2 = Terms {
        expires_at: T0 + 4 * HOUR,
        ..Terms::standard()
    };
    env.send(
        &[revise_plan_ix(&creator.pubkey(), &plan_key, 1, 2, t2)],
        &creator,
        &[&creator],
    )
    .expect("reopen");
    let v2: PlanVersion = env.read(&version_pda(&plan_key, 2));
    let v1: PlanVersion = env.read(&version_pda(&plan_key, 1));
    assert!(
        v2.published_at >= v1.expires_at,
        "v2 was published after v1's window closed"
    );
}

#[test]
fn a_plan_has_at_most_sixteen_versions() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    let plan_key = create_standard(&mut env);
    for v in 1..16u16 {
        let t = Terms {
            content_hash: [v as u8; 32],
            ..Terms::standard()
        };
        env.send(
            &[revise_plan_ix(&creator.pubkey(), &plan_key, v, v + 1, t)],
            &creator,
            &[&creator],
        )
        .unwrap_or_else(|e| panic!("v{} failed: {:?}", v + 1, e.meta.logs));
    }
    let plan: Plan = env.read(&plan_key);
    assert_eq!(plan.latest_version, 16);
    assert_fails_with(
        env.send(
            &[revise_plan_ix(
                &creator.pubkey(),
                &plan_key,
                16,
                17,
                Terms::standard(),
            )],
            &creator,
            &[&creator],
        ),
        "Error Code: TooManyVersions",
    );
}

#[test]
fn every_version_hash_chains_to_the_one_before() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    let plan_key = create_standard(&mut env);
    for v in 1..5u16 {
        let t = Terms {
            content_hash: [v as u8 + 20; 32],
            ..Terms::standard()
        };
        env.send(
            &[revise_plan_ix(&creator.pubkey(), &plan_key, v, v + 1, t)],
            &creator,
            &[&creator],
        )
        .unwrap();
    }
    for v in 2..=5u16 {
        let prev: PlanVersion = env.read(&version_pda(&plan_key, v - 1));
        let cur: PlanVersion = env.read(&version_pda(&plan_key, v));
        assert_eq!(
            cur.prev_terms_hash,
            prev.terms_hash,
            "v{v} must chain on v{}",
            v - 1
        );
    }
}

// ----------------------------------------------------------------- close_plan

#[test]
fn closing_stops_revisions_but_keeps_every_version() {
    let mut env = Env::new();
    let creator = env.creator.insecure_clone();
    let plan_key = create_standard(&mut env);
    let v1 = env.raw(&version_pda(&plan_key, 1));

    env.send(
        &[close_plan_ix(&creator.pubkey(), &plan_key)],
        &creator,
        &[&creator],
    )
    .expect("close");
    let plan: Plan = env.read(&plan_key);
    assert_eq!(plan.status, PlanStatus::Closed);
    assert_eq!(env.raw(&version_pda(&plan_key, 1)), v1);

    assert_fails_with(
        env.send(
            &[revise_plan_ix(
                &creator.pubkey(),
                &plan_key,
                1,
                2,
                Terms::standard(),
            )],
            &creator,
            &[&creator],
        ),
        "Error Code: PlanClosed",
    );
    assert_fails_with(
        env.send(
            &[close_plan_ix(&creator.pubkey(), &plan_key)],
            &creator,
            &[&creator],
        ),
        "Error Code: PlanClosed",
    );
}

#[test]
fn only_the_creator_can_close() {
    let mut env = Env::new();
    let plan_key = create_standard(&mut env);
    let mallory = env.funded();
    assert_fails_with(
        env.send(
            &[close_plan_ix(&mallory.pubkey(), &plan_key)],
            &mallory,
            &[&mallory],
        ),
        "ConstraintHasOne",
    );
    let plan: Plan = env.read(&plan_key);
    assert_eq!(plan.status, PlanStatus::Open);
}
