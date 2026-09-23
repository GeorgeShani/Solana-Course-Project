# Idea Validation — Solana Legacy Vault

A critical review of the V1 product plan ([product-plan.md](product-plan.md)) before any feature work starts.

**Verdict:** the idea holds up. The problem is real and the story is easy to demo. But several parts of the current plan are underspecified or technically wrong on Solana, and the answers change how the program is built.

## 1. The custody problem (most important)

A Solana program can only move assets it controls. "Distribute my assets" needs one of three models:

| Model | How | Pros | Cons |
|---|---|---|---|
| **Escrow** | Owner deposits into a vault PDA | Simple, fully enforceable | Assets are locked away from daily use. Users won't park much value there. |
| **Delegation** | Owner `approve`s the vault PDA as SPL-token delegate | Assets stay in the owner's wallet, so it's truly non-custodial | Only one delegate per token account. Native SOL can't be delegated. The owner can revoke or spend (fine, that's intended). |
| **Hybrid** (recommended) | SOL in a PDA escrow, SPL tokens (USDC) via delegation | Best story: "your tokens never leave your wallet" | Two code paths |

**Recommendation for V1:** hybrid. At minimum, escrow SOL plus one SPL token.

- Legacy (non-programmable) NFTs are just SPL tokens with amount 1, so they come free with the delegation path.
- pNFTs and cNFTs are out of scope. Label them "coming later" in the UI.

## 2. The "lost phone" scenario needs reframing

- If the user still has their seed phrase, they don't need this product.
- If they lost the seed phrase, the only recovery is sending assets to a **backup wallet they own**.
- So add "recover to my own backup wallet" as a first-class beneficiary type. That makes the product useful for the living owner, not only for heirs, and it's a strong differentiator.

## 3. Pin down the trigger semantics

The plan is ambiguous about whether timeout or guardians trigger recovery. Proposed V1 rule:

1. `now > last_check_in + inactivity + grace` **and** guardian approvals ≥ threshold: the vault becomes Activated.
2. The owner can `check_in` / `cancel_activation` at any time before execution. This is a veto.
3. An optional short challenge window runs after the threshold is reached. It protects against guardian collusion while the owner is merely away.
4. `execute_distribution` is **permissionless** (anyone can crank it). Nothing depends on the backend.

## 4. Solana has no cron

- Timers are evaluated lazily with the `Clock` sysvar inside instructions.
- Reminders and notifications need the backend, which means storing contact info (email) off-chain. That's a privacy surface to keep minimal.

## 5. Simplify the account model

- Separate Beneficiary, Guardian, and Recovery accounts add complexity with no V1 benefit.
- Use one `Vault` account with bounded vecs: at most 5 guardians and 5 beneficiaries. Allocations are in basis points and must sum to 10 000.
- Recovery state lives as fields on the vault.

## 6. Make it demoable

Real inactivity periods are days or months. Durations must be configurable in seconds, with a low minimum on devnet and localnet, so the demo runs in about 60 seconds.

## 7. Prior art and differentiation

- Similar tools elsewhere: Casa inheritance, Vault12, Safe recovery modules, Argent guardians, Sarcophagus (Ethereum).
- On Solana: Squads (multisig + time locks). Several past hackathon "dead man's switch" / inheritance projects likely exist.
- **Action:** search the Colosseum project archive for "inheritance", "dead man's switch", "recovery".
- Differentiate on three points:
  - non-custodial delegation
  - recover-to-self
  - the calm, non-crypto UX

## 8. Judging lens

Colosseum weighs viability, not just the demo. Have answers ready for:

- Who is the first user? (Holders with meaningful savings on Solana; families.)
- Why on-chain rather than a lawyer?
- Business model: a small fee on vault creation or distribution, or premium notifications.
- Legal positioning: call it a "continuity / recovery policy", not a legal will.

## 9. Validation tasks (before feature work)

- [ ] Search the Colosseum archive for prior projects. Note 2–3 of them and how this differs.
- [ ] Talk to 5 crypto holders: "What happens to your crypto if you vanish tomorrow?"
- [ ] Spike: can the vault PDA transfer delegated USDC to a beneficiary? This proves the core assumption.
- [ ] Write a one-page threat model: guardian collusion, owner-away false positive, beneficiary key loss.
