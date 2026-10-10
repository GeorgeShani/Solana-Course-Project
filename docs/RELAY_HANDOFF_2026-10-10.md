# Relay — Product and Implementation Handoff

Version: 1.0 · 10 October 2026 · Owner-requested continuation brief

Repository: https://github.com/GeorgeShani/Solana-Course-Project

Reviewed baseline: `b22b7ca9080406d1c9e130de0c3b95a46ae21353`.

This is an implementation brief for the team's development agent, not a Colosseum submission answer. Requirements describe the target unless explicitly marked existing. Research informs the decision; it does not validate demand or promise an award.

## 1. Start here: execution instructions

Continue the existing project. Preserve its on-chain program, backend, domain package, theatre UI, Cue assets, wallet flow and completed work. Do not scaffold a replacement application.

Before editing:

1. Inspect the actual working directory, branch, remote, latest commit and all local changes. The reviewed checkout was clean on `main`; this is not permission to work on main.
2. Read `AGENTS.md`, `CLAUDE.md`, the ENTIRE `docs/RELAY_IMPLEMENTATION_PLAN.md`, `PRODUCT.md`, `DESIGN.md`, relevant README files and applicable nested instructions. Read through all Result notes; newer Results override older implementation descriptions.
3. Create or use a suitable feature branch. Preserve all uncommitted work; never reset, discard or overwrite another branch to make the tree clean. Do not push, merge or deploy without explicit authorization.
4. Inventory implemented capabilities against this brief. Reuse working code before adding a new abstraction. State material differences between this baseline and the current checkout.
5. Reconcile product documentation before feature work: this owner-requested brief updates the audience, source-based timelines and first-release priorities. Preserve protocol/security constraints. Add a dated owner-amendment and continuation phases to the implementation plan; do not erase historical Results or mark old incomplete work complete.
6. Work one continuation phase at a time. For unspecified routine choices, use the simplest compatible implementation and document the choice. Ask only when an unresolved decision materially affects ownership, funds, data rights or product scope; continue independent work meanwhile.

The next agent's FIRST deliverable is a baseline/gap inventory and reconciled documentation, followed by a source-backed timeline vertical slice. A cosmetic redesign alone does not satisfy this brief.

## 2. Product definition

**Name:** Relay

**Tagline:** Meet the traders. Follow the evidence.

**Product:** Relay brings traders' public ideas into followable timelines, connecting original sources, subsequent updates and available execution evidence.

**Customer job:** “I saved this trader's idea. What changed, where is the original context, and what can I actually establish?”

**Audience:** traders and people following traders, across markets. Do not describe the entire audience as Solana traders.

**Initial test audience:** adults already following multiple traders across public sources. Start where the team can obtain useful, reliable data. Solana-backed evidence and Relay-native plans are the first supported execution path, not a claim that every market is verified through Solana.

**Core loop:** Discover → Inspect → Watch → Relevant update → Return → Understand.

**Differentiation hypothesis:** following the development of one idea, with original context, evidence boundaries and a personal change inbox, is more useful than another profile directory or trading feed. This must be tested; do not claim Relay invented social trading or has no competitors.

## 3. Existing functionality and remaining gaps

The repository has advanced beyond its original skeleton. Source inspection at the baseline found:

| Capability                                                        | Baseline evidence                                                                | Continuation treatment                           |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| Plan commitments and append-only versions                         | Anchor program and domain client; documented completed phases                    | Preserve                                         |
| Follow receipts and anti-forgery checks                           | Program, Kit composer and backend verification                                   | Preserve; no security weakening                  |
| Feed, prices, plan detail, quotes, execution verification/history | Hono services and routes                                                         | Preserve contracts                               |
| Theatre feed, welcome, finale and Cue                             | App components, styles and SVG-derived assets                                    | Reuse and refine only where needed               |
| Trader list/profile                                               | `app/src/lib/traders.ts` groups plan authors by wallet                           | Not a general public-trader catalogue            |
| Record-kind labels                                                | `app/src/lib/record-kind.ts`                                                     | Labels exist; not evidence that ingestion exists |
| Browser watchlists                                                | `watchlist.ts`, `trader-watch.ts`; trader entries retain a seen publication time | Extend without losing saved items                |
| Wallet connection and trade panel                                 | Existing wallet/trade components and frontend flows                              | Verify current behavior; preserve                |
| Public-post ingestion and source-backed trader index              | PRODUCT.md explicitly records these as not connected                             | New work                                         |
| General idea timelines, evidence requests and change inbox        | Not established by this review                                                   | Inventory, then implement                        |
| Cross-market brokerage verification                               | Not connected                                                                    | Defer                                            |
| Exit receipts / realized results                                  | Later milestone in plan                                                          | Never fabricate                                  |

Historical Result notes report program/backend tests and real Jupiter routes on a Surfpool mainnet fork. This handoff did not rerun those tests. Existing code, screenshots and build artifacts are not proof of production operation, a mainnet launch or a security audit.

Relevant existing routes include `/`, `/traders`, `/traders/$address`, `/records/$planPda`, `/watchlist`, `/account`, `/how-it-works`, `/demo`, `/me` and `/search`. Check current route definitions and aliases before changing them.

## 4. Two paths: never blend their authority

### A. Public-source discovery

Browse a sourced record → inspect its original context → watch the idea/trader → inspect subsequent records and evidence.

- No wallet or funds required.
- Can represent different markets.
- A public statement is not proof of an executed trade.
- Sources and record relationships require attribution.
- Ingestion errors and unavailable sources remain visible.
- External ideas do not become executable Relay plans automatically.

### B. Relay-native plan execution

Review a committed plan → enter an amount → obtain a fresh quote → explicitly sign one supported trade → inspect its verified receipt or failure.

- Existing Solana program is the authority for supported plan/receipt rules.
- Only supported pairs/routes/networks are exposed.
- A creator update never authorizes a follower transaction.
- Connecting a wallet does not authorize trading.
- A successful entry receipt does not prove a closed position, realized profit, a person's entire record or a good investment.

Solana is essential to path B. Path A can run off-chain; do not add transactions to browsing merely to make blockchain usage visible.

## 5. Release scope

### Must deliver

- Two or three genuinely sourced profiles/ideas, chosen for accessible data. Ten selected traders is the expansion target, not a blocker or permission to invent identities.
- One source-backed idea timeline with an actual related update.
- Trader/idea watching without a wallet.
- A “Since your last visit” view showing meaningful unread updates.
- A narrow evidence-request and response flow, with transparent review status.
- Honest source availability, attribution and freshness states.
- Preserved Relay-native plan/receipt demonstration on the supported fork/test environment.
- Separate labelled fictional walkthrough for scenarios unavailable in live data.

### Defer

Automatic copy trading, Binance execution, stock/forex trading integrations, custody, pooled funds, monetary vouches/challenges, escrow payouts, reviewer voting, tokens, performance leaderboards, universal trust scores, full self-service creator onboarding and cross-device watch sync.

Do not display a control that implies an unsupported function works. Clearly distinguish planned features from functioning features.

## 6. Source and identity rules

For every candidate trader/source, record authenticity evidence, access method, permitted display, update capability, attribution basis, freshness and limitations. Use participating creators where practical. Do not imply endorsement or partnership for public-source profiles.

- A wallet signature establishes control of that wallet, not a person's identity or complete portfolio.
- Distinguish a wallet-published plan from a verified public-person association.
- Record source publication time separately from Relay retrieval/capture time.
- Never manufacture entry ranges, targets, expiries, transactions, profits or follower results.
- Only show plan-range status for explicit supported terms. Otherwise: “Entry conditions not specified.”
- Do not associate a post with a wallet action merely because both mention the same asset.
- Mark relationships as creator-confirmed, editorially associated, or uncertain, with the basis recorded.
- Public visibility does not imply unrestricted scraping, republication or permanent retention.
- Support unavailable/deleted/edited-source states. Respect provider deletion rules; keep an appropriate tombstone/provenance record rather than prohibited copies.
- A later hash commitment proves a commitment existed at that later point. It does not prove the original post existed before an earlier market move or that its content was true.
- Quoting and summaries must remain within applicable permissions; original links should always be available when possible.

Start with one permitted ingestion route. If access is unavailable, a manually curated source link can establish a real prototype, labelled as manual coverage. Do not claim automated monitoring from manual records.

## 7. Minimal data contract

These are proposed logical entities, not claims that migrations exist. Adapt names to established conventions. Keep new discovery entities separate from protocol plan/receipt entities.

| Entity             | Required data                                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TraderProfile      | Stable ID, display name, market coverage, official links, attribution basis, participation state, coverage limits                                               |
| SourceRecord       | Stable ID, source/provider ID and URL, trader attribution, type, published time if known, retrieved time, availability, permitted displayed content, provenance |
| Idea               | Stable ID, linked original SourceRecord, title/faithful summary, explicit asset/market identifiers, nullable stated conditions                                  |
| TimelineEvent      | Stable ID, idea ID, event type, event/observed time, source/evidence references, relationship basis, revision, review state                                     |
| EvidenceRequest    | ID, idea/record ID, narrowly framed question, requester identity/session, created time, status                                                                  |
| EvidenceSubmission | Request ID, source URL or transaction reference, explanation, review status, reviewer attribution and timestamp                                                 |
| WatchEntry         | Target type/ID, saved time, last acknowledged event cursor, browser schema version                                                                              |

Demo state must be a separate provenance flag/environment, not an authoritative evidence type. Existing code uses `fictional` as a record kind; adapt carefully so fictional public posts and fictional plans can still show their underlying kind without entering live data.

Unknown dates/attribution are nullable and displayed as unknown. Use deterministic ordering and stable IDs. Do not use timestamps alone as unread cursors: tied timestamps and late-arriving records must work. Use a server event cursor/sequence or equivalent ordering plus explicit acknowledgement.

## 8. Proposed API additions

Inspect existing routes before implementation. Names below are proposed, not currently available endpoints:

- `GET /discovery/traders` — cursor-paged sourced profiles and coverage.
- `GET /discovery/traders/:id` — profile and source-backed activity.
- `GET /discovery/ideas/:id` — original record, provenance and timeline.
- `GET /discovery/changes` — changes for bounded watched target IDs/cursors; never scan the whole catalogue in the browser.
- `POST /discovery/evidence-requests` — create a validated, rate-limited request.
- `POST /discovery/evidence-requests/:id/submissions` — submit a supporting reference for review.
- Evidence review: authenticated internal operation or existing administration mechanism; no public caller may approve their own submission.

Keep request sizes/target counts bounded, use runtime validation, and preserve Origin guards and rate limits. Watching remains local initially. Evidence writes need a server-issued session identity; a pasted wallet address is not authentication. Guest browsing stays open. Use a minimally scoped browser session for the pilot if no authentication system exists; do not pretend it identifies a unique human or prevents Sybil attacks. Use review/moderation and stronger authentication before opening writes broadly.

Evidence intake must handle unsafe links. Do not fetch arbitrary submitted URLs server-side without SSRF protection; reject private/local destinations and validate redirects. Prefer references to approved providers. Untrusted text is never an agent instruction or executable HTML.

Existing `/feed`, `/plans/:planPda`, `/plans/:planPda/confirm`, `/prices`, `/follow/quote`, `/follow/verify` and `/me/executions` stay compatible unless an intentional migration is justified and tested. Verify exact request shapes in code; older plan examples may differ.

## 9. Return-use behavior

The first return screen answers “What changed since I last checked?”

- Relevant events: a sourced update, new evidence, reviewed response, unavailable original source or explicit plan-condition change.
- Group related events under the idea. Avoid counting every token transfer as a meaningful update.
- Do not mark events read merely because a background refresh occurred. Acknowledge when opened or explicitly marked read.
- Keep stable content while a reader is inspecting a record; offer a new-updates indicator rather than reshuffling.
- Show freshness and delayed/missing-source states.
- “You’re caught up” is a successful state, not a reason to fabricate activity.
- Notifications/digests are opt-in later; no messages are sent as part of this handoff.
- No rewards for depositing, trading frequency or keeping an investment desire. Retention should come from useful information.

Potential future revenue: deeper monitoring/history/comparison subscriptions. This is unvalidated. Basic provenance, evidence limits and corrections should remain accessible. Do not add pricing or paid-plan claims without a separate decision.

## 10. UI and brand requirements

Reuse the actual theatre and Cue assets. Visual reference: https://github.com/MariamManjo/curtain-sol.

- Welcome: closed curtains, Relay logo, Cue, concise value line, Explore traders and Try the demo. No full app navigation or wallet gate.
- App: Discover, Traders, Watchlist, Account; coherent desktop header and mobile bottom navigation with safe-area padding.
- Feed: quick summaries and evidence labels. Timeline/detail: original source, development and evidence inspection.
- Watchlist: separate Traders, Ideas/Records and execution History. Add a clear changes view without conflating watching with trading.
- How it works: visual, short, interactive explanation; essential evidence distinctions remain accessible.
- Trading: clear pay/receive, minimum output, fees, freshness, expiry, network and explicit signing. Reuse the panel; no unsupported modes.
- Closing scene: Cue bows and offers Watchlist or Explore again.
- Use the supplied wordmark/SVG if present. No Figma link or design-system link is included in this handoff: locate existing local assets/references and request a link only when necessary for faithful work.
- Preserve existing design tokens unless the owner specifies a change. Use available Impeccable/frontend skills following their prerequisites.
- Cue cursor: small desktop fine-pointer character, non-intercepting, disable option. Native cursor for inputs/financial forms/controls; touch and reduced-motion fallback.
- Motion enhances discovery and feedback. No movement of controls, distracting motion around prices, automated feed advance or interruption of signing.
- Keyboard navigation, visible focus, accessible labels, non-colour-only states and reduced motion are required.
- Test 390×844, a short mobile viewport and desktop. No cropped content or navigation overlap.

## 11. Truth labels and terminology

Use specific labels: Public statement, Source added, Evidence requested, Discrepancy flagged, Response added, On-chain activity, Published through Relay.

“Verified execution” is restricted to established execution facts. Do not say Verified trader, Trusted trader, Best trader, True claim or Complete track record without a precisely supported meaning.

For Relay plans, preserve exact established statuses: In plan range; Original entry passed; Below plan range; Plan expired; Closed by creator; Price may be outdated; Price unavailable.

For demos: readable slide/page-level “Illustrative scenario” or “Fictional demo” may reduce repetitive card text, but fiction must remain unmistakable, including shared/exported records. No fictional signatures or real-looking execution evidence. Browser demo actions must not write into live watch/evidence state.

## 12. Technical invariants

- Preserve TanStack Start, React, Hono, Bun, Postgres, Anchor and the existing `@solana/kit` client. Do not transplant the Next.js reference app or downgrade SDKs.
- No TypeScript assertions (`as X`, `as unknown as X`). Narrow unknown values with guards/runtime parsers.
- Integer monetary paths and explicit units; distinguish display strings from protocol values.
- Failed transactions remain failed. Verification rereads chain evidence; never trust browser outcomes.
- No program-authority, deployment or financial changes in a discovery/UI migration.
- No keys, seed phrases or bearer tokens in code, output or documentation. Fork tests use authorized burner wallets only.
- Preserve Origin guards. Diagnose app/server ports, proxy target, configured origin, database readiness and RPC cluster rather than disabling controls to fix a 502.
- Preserve existing saved data with versioned parsing/migration. Non-wallet public profile IDs need not be wallet addresses; use typed identities and maintain legacy wallet routes.
- Format changed files only. Avoid sweeping dependency upgrades or unrelated refactors.

## 13. Continuation phases and acceptance gates

These are new continuation phases, not replacements for historical numbered phases.

### C0 — Inventory and reconcile

- [ ] Record current commit, branch, capabilities and missing integrations.
- [ ] Add dated product amendment and map this brief into the implementation plan.
- [ ] Confirm one viable source and identity/coverage basis.

Gate: no claim that labels/UI imply ingestion; existing backend and work are preserved.

### C1 — Real source → timeline

- [ ] Store/read one authentic source record and its provenance.
- [ ] Represent one idea and related update with an explicit relationship basis.
- [ ] Render source, published/retrieved times and unavailable/unknown states.
- [ ] Separate demo, external records and native plans.

Gate: a reviewer can open the underlying source and understand exactly what Relay establishes. Manual collection is labelled; automation is claimed only if running.

### C2 — Watch → changes → return

- [ ] Add idea/trader watches while migrating existing watch state safely.
- [ ] Implement stable event cursors and a changes inbox.
- [ ] Mark read through deliberate interaction, not background refresh.
- [ ] Handle reload, tied dates, late arrival, duplicate events, blocked storage and source errors.

Gate: watching one real idea, adding a genuine sourced update, reloading and opening the unread update works end to end.

### C3 — Ask for evidence → response

- [ ] Implement bounded validated requests/submissions, requester session and internal review.
- [ ] Show pending/reviewed/rejected or unresolved states without truth certification.
- [ ] Append response events and surface them to watchers.
- [ ] Prevent unauthorized reviews, unsafe URL fetching, HTML injection and duplicate spam.

Gate: a request and reviewed response are persisted and visible in the same timeline and changes view. No staking or automatic truth judgments.

### C4 — Integrated demonstration and pilot

- [ ] Regression-check existing plan/quote/receipt flow under its documented environment.
- [ ] Keep supported execution separate from imported ideas.
- [ ] Complete visual, accessibility and failure-state checks.
- [ ] Prepare a genuine-source journey and an explicitly fictional fallback.
- [ ] Record current limitations and test results; no mainnet/traction/audit claims without evidence.

Gate: reviewer completes Discover → Inspect → Watch → Return → Evidence inspection, plus the separate supported execution demonstration.

## 14. Validation and verification

Run relevant repository checks after changes: root lint, affected domain/server/app tests and type checks, app build, and DB migration/integration checks for new persistence. Program tests are required if protocol/client changes occur; do not run live signing/deployment merely to check documentation or UI.

Test behaviors rather than duplicating implementation: unknown attribution, uncertain relation, source removal, late update ordering, unread acknowledgements, demo isolation, unauthorized evidence review, rejected transaction and error recovery.

Capture rendered mobile/desktop screens only after exercising the journey. A homepage HTTP 200 or screenshot does not validate source ingestion, persistence or transaction verification.

Suggested assisted pilot: ten target users, with predeclared experimental gates:

- Seven distinguish a public statement from execution evidence.
- Five watch an idea unaided.
- Four return after receiving a genuine relevant update.
- Three explain an existing checking routine Relay replaces.

These are test assumptions, not benchmarks or traction. Measure retention among users with useful updates; diagnose weak data coverage separately from weak demand. Recruit through communities the team can actually reach and participating creators; do not assume famous profiles supply distribution. Do not contact anyone without authorization.

## 15. Research basis and limits

Research read on 10 October 2026 using Colosseum Copilot v2.0.2, current primary pages and The Grid. This file carries forward that research rather than claiming a new market survey.

- [FOMO](https://fomo.family/): feed, discovery, leaderboards and alerts overlap with Relay. The Grid returned its product/org record. Discovery alone is not differentiation.
- [AfterHour](https://www.afterhour.com/): social trading and brokerage-connected verification. Broader-market positioning does not remove competition.
- [TipRanks methodology](https://www.tipranks.com/experts/how-experts-ranked): public recommendation tracking with explicit measurement methodology. Do not create unsupported accuracy scores.
- [Trenches.top Colosseum record](https://colosseum.com/projects/explore/trenches.top): Radar 2024 second-place Consumer award; historical presentation demonstrated call feeds/rankings, while copy execution was conceptual. Current live site did not load in this review; no present-day functionality inferred.
- [Alpha Group Trading Colosseum record](https://colosseum.com/projects/explore/alpha-group-trading): Frontier 2026 $10,000 winner award; private circles/verified records described by the team, with no available repo/demo summary in that record.
- [CredCall Colosseum record](https://colosseum.com/projects/explore/credcall): unawarded historical staking/slashing prototype. A precedent for additional complexity, not demand proof or a claim of current status.
- [X pricing](https://docs.x.com/x-api/getting-started/pricing) and [display policy](https://docs.x.com/developer-terms/policy): access cost, display and removal obligations must be evaluated before ingestion.
- [Telegram bot access](https://core.telegram.org/bots/faq): channel membership/access constraints affect updates.
- [Plaid Investments](https://plaid.com/docs/investments/): linked-account data access exists; not public access to arbitrary traders or an installed Relay integration.
- [ESMA copy-trading classification](https://www.esma.europa.eu/publications-data/questions-answers/2463): execution service classification requires case-specific analysis in applicable jurisdictions. Explicit per-trade approval or a “not advice” label alone is not a legal determination. Public launch needs a scoped review of the actual service and markets.

No universal novelty, commercial success, secure-production status, user demand, deadline eligibility or winner prediction is established. Recheck volatile policies/provider compatibility before implementing an integration. New tools to install should be researched through the current Colosseum resources hub and their official docs; this handoff does not authorize installing services, paying for access or uploading private repositories.

## 16. End-of-phase agent report

Report: what was implemented; actual branch and commit; modified files; checks run and results; data/source/network used; manual versus automated coverage; remaining limitations; and the next continuation gate.

Never report complete while required acceptance gates fail. Do not silently publish this brief or any changes. The remaining central uncertainty is whether reliable sources produce useful updates that users return to inspect.
