# Solana Legacy Vault — Version 1 Product Plan

> Stack note: the original draft named Angular for the frontend. The project uses **React** (Vite + TypeScript, bun). Everything else is unchanged. See [idea-validation.md](idea-validation.md) for the critical review and the decisions that refine this plan.

## 1. Product Overview

**Working name:** Solana Legacy Vault

**One-line description:** A Solana-based emergency and digital inheritance system that helps a user decide what happens to their digital assets if they become unavailable.

**Product category:** Safety, continuity, and controlled asset recovery for digital ownership.

**Version 1 goal:** Build a clear, understandable, and technically credible product that shows how a user can create a vault, define beneficiaries, set recovery rules, check in periodically, and trigger controlled distribution of assets through a Solana program.

**Version 1 must include:**

- a frontend application
- a Rust + Anchor Solana program
- an integration layer between frontend and chain
- a simple, understandable recovery flow
- a product story that makes sense in everyday life

## 2. Problem Statement

Cryptocurrency gives users direct ownership, but that ownership creates a serious problem: if the owner loses access, becomes inactive, or dies, the assets may become permanently inaccessible.

Traditional finance has recovery systems. Banks, lawyers, inheritance processes, identity checks, and account support all exist to prevent total loss of access.

Crypto often has only:

- a wallet
- a seed phrase
- a private key
- no real recovery path

That means the user is responsible for everything, and in real life people forget, lose devices, get hospitalized, travel unexpectedly, become overwhelmed, or simply stop checking certain accounts. Version 1 should solve this in a way that feels practical instead of futuristic.

## 3. Why This Product Matters in Everyday Life

This product should feel relatable to a normal person, not only to a crypto expert.

- **3.1 Lost phone or broken laptop.** A user may lose access to their device and no longer be able to open the wallet app, confirm transactions, or remember where everything was stored.
- **3.2 Long travel or being unreachable.** A user might travel for weeks, end up in a place with poor connectivity, or simply stop using a device they usually rely on.
- **3.3 Medical emergency.** A user may be unable to respond to alerts, confirm activity, or manage assets for a period of time.
- **3.4 Family access problem.** A family member may know the user has digital assets, but nobody knows how to recover them without breaking security.
- **3.5 "I'll handle it later" problem.** People often postpone organizing important digital matters. That delay can be harmless for normal apps, but costly for assets that disappear if no one can access them.
- **3.6 Inheritance and continuity.** People already understand wills, beneficiaries, and emergency contacts in ordinary life. This product translates that idea into digital ownership.
- **3.7 Shared responsibility.** Some people want someone they trust to be able to intervene only if something is clearly wrong. They do not want full access today, but they do want protection for the future.

## 4. Product Vision

Solana Legacy Vault is not a replacement for a wallet.

It is a layer that sits on top of digital ownership and answers a different question:

**What happens to my assets if I cannot manage them anymore?**

The product should feel like a safety mechanism, not a trading app, not a DeFi dashboard, and not a complicated crypto tool.

## 5. Version 1 Scope

Version 1 should focus on the smallest useful version of the product.

Version 1 should allow the user to:

1. Connect a Solana wallet.
2. Create a vault.
3. Add beneficiaries.
4. Add guardians or trusted contacts.
5. Set inactivity rules.
6. Check in periodically.
7. Trigger a recovery flow after inactivity.
8. Distribute assets according to predefined rules.
9. View the current vault state and recovery status.

Version 1 should not try to:

- become a full wallet
- become a legal inheritance platform
- support every token standard imaginable
- solve every possible recovery scenario
- add unnecessary DeFi features
- store private keys
- store seed phrases
- manage trading or yield
- become a mobile app in V1
- add AI features
- store documents on-chain

## 6. Product Principles

- **6.1 Simple enough to understand quickly.** A new user should understand the purpose in less than a minute.
- **6.2 Serious enough to feel trustworthy.** The product must look and behave like something handling important value.
- **6.3 No private key custody.** The app should never ask for or store private keys or seed phrases.
- **6.4 On-chain where it matters.** Rules, permissions, vault state, and recovery actions should be managed by the Solana program.
- **6.5 Off-chain where it is safer or more practical.** User interface, reminders, notifications, and convenience features can stay off-chain.
- **6.6 Familiar mental model.** The user should understand the product through concepts they already know: emergency contact, beneficiary, check-in, approval, recovery, timeout, distribution.

## 7. Core User Roles

- **7.1 Vault Owner.** The person who creates the vault, owns the assets, sets the rules, and performs check-ins while active.
- **7.2 Beneficiary.** The person or wallet that receives assets after a valid activation or distribution event.
- **7.3 Guardian.** A trusted person who can confirm that the owner is truly inactive or cannot respond.
- **7.4 System Operator.** The app backend or service layer that helps with reminders, indexing, and notifications, but never controls assets.

## 8. Primary User Stories

- **8.1 Create a vault.** As a user, I want to create a vault so that my digital assets can be protected by a recovery policy.
- **8.2 Add beneficiaries.** As a user, I want to define who receives my assets so that the system knows what to do later.
- **8.3 Add guardians.** As a user, I want to assign trusted people so that recovery is not triggered too easily.
- **8.4 Check in.** As a user, I want to confirm that I am active so that my vault remains in normal mode.
- **8.5 Missed check-in warning.** As a user, I want the system to warn me before any final action happens so that I can react in time.
- **8.6 Activation after inactivity.** As a user, I want the vault to move into recovery only after the configured inactivity period has passed.
- **8.7 Guardian approval.** As a guardian, I want to review and approve recovery requests so that activation is not accidental.
- **8.8 Automatic distribution.** As a beneficiary, I want assets to be distributed according to the owner's rules so that the intended result happens without manual disputes.
- **8.9 View vault status.** As a user, I want to see my vault's condition and timers so that I know what is currently active.

## 9. Everyday-Life Scenarios

- **A — "My phone is gone."** A user loses their phone on a trip. The wallet app is unavailable. Instead of a total loss, the vault has a defined recovery path.
- **B — "I am offline for a long time."** A user is busy, traveling, or disconnected for weeks. The app has a check-in rule and a grace period before anything serious happens.
- **C — "My family should know what to do."** A user wants their partner, sibling, or parent to receive certain assets later without making them guess or fight with exchanges.
- **D — "I am in the hospital."** A user cannot answer prompts for a while. Guardians can begin the recovery process only if the rules allow it.
- **E — "I keep meaning to organize my digital life."** A user has a few tokens, some NFTs, and maybe some future assets, but no clear plan. The vault gives them a way to set a simple policy now.
- **F — "I want a responsible backup plan."** A user does not think disaster is likely, but they still want a backup that works when life becomes messy.

## 10. Version 1 Product Flow

### 10.1 Onboarding flow

1. Open the app.
2. Connect a Solana wallet.
3. See a simple explanation of what the vault does.
4. Create a vault.
5. Add beneficiaries.
6. Add guardians.
7. Set inactivity rules.
8. Confirm the transaction.

### 10.2 Regular use flow

1. Open the dashboard.
2. View vault status.
3. See next required check-in.
4. Perform a check-in.
5. Confirm that the timer resets.

### 10.3 Recovery flow

1. Check-in is missed.
2. Grace period begins.
3. Guardians are notified.
4. Required approvals are collected.
5. Recovery is activated.
6. Distribution rules are executed.

## 11. Version 1 Feature Set

### 11.1 Wallet connection

The app must support a Solana-compatible wallet connection flow. The user should be able to connect a wallet, see the connected address, disconnect safely, and sign transactions through their wallet.

### 11.2 Vault creation

The user creates a vault with: owner wallet, guardians, beneficiaries, inactivity period, grace period, distribution rules, vault status.

### 11.3 Beneficiary management

The user can define: one or more beneficiaries, wallet addresses for beneficiaries, percentages or fixed distribution rules, assets assigned to each beneficiary.

### 11.4 Guardian management

The user can define: trusted guardians, approval threshold, whether one guardian alone is enough or multiple are needed, guardian status for recovery requests.

### 11.5 Check-in system

The user can: confirm they are active, reset the inactivity timer, view the next required check-in date, receive reminders before the deadline.

### 11.6 Recovery activation

The vault can move into recovery when: the inactivity period has passed, the grace period ends, the required guardian approvals are collected.

### 11.7 Asset distribution

When recovery is fully activated, the program can: transfer supported assets according to rules, update vault status, mark the distribution as completed.

### 11.8 Status dashboard

The dashboard should show: current vault state, last check-in date, next check-in date, inactivity countdown, guardian status, beneficiary summary, recovery progress.

## 12. Assets and Supported Categories in V1

Version 1 should not try to support everything. It should support a manageable set of asset concepts.

- **12.1 Financial assets:** SOL, USDC, other SPL tokens.
- **12.2 Digital collectibles:** NFTs, tokenized collectibles, symbolic digital items.
- **12.3 Future-facing categories** (shown in the UI as a concept, no deep V1 functionality): certificates, memberships, achievements.

## 13. On-Chain vs Off-Chain Responsibilities

### 13.1 On-chain responsibilities

The Solana program should manage: vault state, ownership, beneficiary data, guardian approval rules, check-in timestamps, inactivity logic, recovery state, distribution logic, asset transfer execution.

### 13.2 Off-chain responsibilities

The frontend or supporting service can handle: interface rendering, wallet connection UX, reminders, notifications, indexing, analytics, convenience views, transaction status display.

### 13.3 Important boundary

The backend must never control user funds directly. It may assist with convenience, but the Solana program is the authority for vault rules and asset movement.

## 14. System Architecture

### 14.1 Frontend

The main user-facing application. Responsibilities: connect wallet, create vault, show vault status, let users add beneficiaries and guardians, let users perform check-ins, show recovery progress, request transaction signatures, display transaction history and status.

### 14.2 Solana program

The Rust + Anchor program is the source of truth for: vault rules, timestamps, approvals, activation, transfers.

### 14.3 Connection layer

The frontend interacts with the Solana program through a clear integration layer:

1. frontend builds a transaction
2. wallet signs it
3. transaction is sent to Solana RPC
4. Anchor program updates state
5. frontend reads the result and updates the UI

### 14.4 Optional support backend

A lightweight backend can exist for: reminder emails, push notifications, indexed read models, status caching, activity logs.

This backend must remain read/support oriented and must never be able to move assets without a user-authorized transaction.

## 15. Frontend Specification

### 15.1 Suggested stack

- React
- TypeScript
- Vite
- Solana wallet adapter
- Anchor TypeScript client
- SCSS or Tailwind CSS

### 15.2 Main pages

- **Dashboard** — wallet address, vault summary, current status, check-in timer, beneficiaries, guardians, recent activity.
- **Create Vault Wizard** — (1) connect wallet, (2) name or identify the vault, (3) add beneficiaries, (4) add guardians, (5) set inactivity period, (6) set grace period, (7) review summary, (8) confirm transaction.
- **Vault Detail Page** — current vault status, rule configuration, last check-in, recovery state, beneficiary breakdown, guardian approval progress.
- **Guardian Page** — pending activation requests, vault status, approve or reject actions, current approval threshold.
- **Activity / History Page** — check-ins, changes to beneficiaries, guardian approvals, activation events, distribution events.

### 15.3 UI goals

Clear, calm, trustworthy, easy to scan, understandable to non-crypto users.

### 15.4 UX tone

The interface should feel like a serious safety tool, not a speculative crypto app.

## 16. Solana Program Specification

### 16.1 Technology choice

Rust, Anchor Framework, Solana program deployment.

### 16.2 Program responsibilities

Vault creation, vault updates, guardian registration, beneficiary registration, check-in updates, activation requests, approval collection, final distribution.

### 16.3 Core account types

- **Vault account** — owner, guardians, beneficiaries, last check-in timestamp, inactivity period, grace period, activation status, distribution status.
- **Beneficiary record** — beneficiary wallet, asset assignment, distribution percentage or rule.
- **Guardian record** — guardian wallet, approval status, relation to vault.
- **Recovery request** — request timestamp, current approval count, approval threshold, request state.

### 16.4 Core instructions

- `create_vault` — creates the vault and initializes the owner's configuration.
- `add_beneficiary` — adds or updates a beneficiary entry.
- `add_guardian` — adds or updates a guardian entry.
- `check_in` — updates the user's last active timestamp.
- `request_activation` — begins the recovery process after inactivity.
- `approve_activation` — allows a guardian to approve recovery.
- `execute_distribution` — performs the final asset distribution when all rules are satisfied.
- `cancel_activation` — allows recovery to be stopped if the owner becomes active again before final distribution.

### 16.5 Important constraints

- only the owner can modify the vault while active
- only valid guardians can approve
- distribution only occurs after rules are satisfied
- no asset transfer occurs without proper authorization and state checks

## 17. Integration Model Between Frontend and Solana

### 17.1 Communication flow

1. User acts in the frontend.
2. Frontend prepares the desired instruction.
3. Wallet signs the transaction.
4. Transaction is sent through Solana RPC.
5. Anchor program validates and updates state.
6. Frontend reads updated state and reflects it to the user.

### 17.2 What the frontend should talk to

Solana web3 tooling, Anchor TypeScript client, wallet adapter libraries, RPC reads for vault state and status.

### 17.3 Why this matters

- the frontend is the interface
- the blockchain program is the authority
- the wallet is the signer
- the RPC is the transport path

## 18. Security Principles

- **18.1 Never store:** private keys, seed phrases, passwords, raw secrets used to control assets.
- **18.2 Store on-chain** only what the program truly needs: wallet addresses, permissions, timestamps, rule configuration, approval state, distribution state.
- **18.3 Store off-chain:** reminder messages, notifications, helpful descriptions, UX metadata. If any sensitive notes are stored off-chain, they should be encrypted and only referenced by verification hashes on-chain.
- **18.4 Trust boundaries:** the user signs changes; guardians approve recovery; the program enforces the rules; the backend never gains custody.

## 19. Data Model Summary

- **Vault** — owner address, created at, last check-in, inactivity duration, grace duration, status, beneficiary list, guardian list, approval count, distribution status.
- **Beneficiary** — wallet address, percentage or fixed allocation, asset type assignment.
- **Guardian** — wallet address, approval eligibility, current approval state.
- **Recovery request** — vault ID, initiation timestamp, approval progress, final decision status.

## 20. Version 1 Success Criteria

1. A user can connect a Solana wallet.
2. A user can create a vault.
3. A user can add beneficiaries and guardians.
4. A user can configure inactivity and grace periods.
5. A user can perform check-ins.
6. The program stores and updates the vault state correctly.
7. Guardians can approve activation.
8. The recovery flow can complete.
9. Asset distribution can execute according to the configured rules.
10. The frontend makes the full flow easy to understand.

## 21. What Makes This a Good Version 1

Understandable, realistic, technically meaningful, useful outside of the hackathon context, easy to explain in a demo, and not overloaded with unnecessary features. It combines a familiar real-life problem, a clear blockchain use case, a polished frontend opportunity, a manageable Anchor program, and a simple but impressive demo story.

## 22. Demo Narrative

A user creates a vault. They add their partner or sibling as a beneficiary. They assign one or more guardians. They set a check-in period. Later, the user misses the required check-in. The app shows the recovery timer. Guardians are notified and approve the activation. The program executes distribution automatically.

The audience should leave with one clear idea: the blockchain is enforcing a real recovery policy that the user configured in advance.

## 23. Non-Goals for Version 1

Do not build: a complete wallet replacement, a legal estate management platform, a mobile app, a DeFi dashboard, trading tools, yield tools, private key recovery, AI assistance, document vault storage, complex identity verification flows, advanced cross-chain support.

## 24. Final Product Statement

Solana Legacy Vault is a programmable safety layer for digital ownership. It helps a user answer one practical question: **What happens to my digital assets if I cannot access them anymore?**

Version 1 should make that idea simple, believable, and technically real.
