# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Followers (primary):** adult Solana spot traders who already follow trade ideas from creators on X or Telegram. They arrive on a phone, often between other apps, and want to know in a few seconds whether a creator's plan still applies to them.
- **Creators (secondary):** people who publish trade plans and want a public, tamper-evident record of what they said and when, plus evidence of how followers actually did.

## Product Purpose

**Relay connects people with Solana traders' public ideas and verifiable activity in one scrolling experience** (owner clarification 2026-10-10). It starts with 10 selected traders. They are never called the world's best, verified partners or trustworthy without evidence.

Inside that, Relay-native plans answer one question: _"Is this trade idea still available to me, and what happened after people actually followed it?"_ ("Follow the plan. See the proof.")

Success means a reader can tell in seconds what kind of record they are looking at, where it came from and when, and read a plan's entry status correctly in 2–5 seconds, understand that it is not a recommendation, and, if they choose, review and approve one swap themselves that the program records as a verified receipt.

### Four kinds of content, never blended

| Kind | Label | What it proves |
| --- | --- | --- |
| Public idea or post | Public post | That the trader said it, linked to the original source and time. Not that a trade happened. |
| Verified on-chain activity | On-chain activity | A transaction on Solana, shown under a person only when the wallet association is supported. |
| Plan published through Relay | Published through Relay | A plan the wallet signed and committed onchain. The only kind that can be reviewed as a trade. |
| Fictional demo | Fictional demo | Nothing. Invented for the walkthrough. |

- Every public record carries its original source and timestamp.
- A wallet is associated with a person only when supported (today: the wallet signed the plan; later: a signed link, plan Phase 16). A wallet is not a person.
- Missing data stays missing. Relay never invents trades, returns, endorsements or entry ranges, and never turns an imported post into an executable plan.
- Relay does not promise Binance or copy-trading integration.

## Positioning

The unit of truth is the follower's own execution against a specific, immutable plan version, not the creator's claimed PnL. Plans are committed onchain (append-only versions with a hash chain), and a follow receipt can only exist if a real in-range swap happened in the same transaction. Screenshots and "+20%" claims cannot show this.

## Operating Context

- Discovery flow: browse trader activity (Discover) → open a trader profile with source links and supported identity → open a record to see what was posted, when, and what evidence exists → watch a trader or record without a wallet → return to the Watchlist for updates → connect a wallet only when a supported action needs it.
- Navigation (owner decision 2026-10-10): Discover, Traders, Watchlist, Account. On phones a bottom tab bar inside the app only (never on the welcome); on desktop the same destinations plus How it works in the header. Old `/me` and `/search` links redirect to `/watchlist` and `/traders`. Publishing is an action, not a tab.
- Discover is a vertical, card-by-card feed (no auto-advance).
- Watching a trader or a record needs no wallet; it is stored in the browser.
- A wallet is requested only to review a trade or publish a plan.
- The demo runs on a local Surfpool mainnet fork in desktop Chrome at a 390×844 viewport with a labelled local burner wallet.

## Capabilities and Constraints

- **Entry-status vocabulary (exact, shared by UI, API, docs and tests):** In plan range · In plan range · closes in N min · Original entry passed · Below plan range · Plan expired · Closed by creator · Price may be outdated · Price unavailable. Each always has an icon, a shape, words and a visible hint. "Eligible" is never used.
- Entry status is advisory (feed price) and never described as safe, recommended or profitable. The binding check is onchain.
- Money is integer units; prices are shown with tabular numerals.
- Stack is fixed: TanStack Start, Hono, Postgres, Anchor, Bun, `@solana/kit`.
- The server is required for the feed; when it is down the app says so instead of showing stale or invented data.
- Undecided: light theme (MVP-later), search.

## Brand Commitments

- **Theatre identity, recolored in Solana colors** (owner decision 2026-10-09): opening curtain, the RELAY marquee with chasing bulbs, a restrained spotlight behind the active card, and a closing-curtain / end-of-feed moment.
- The original showcase reference is the `curtain-sol` prototype (theatre components in `app/components/theatre/*`). Its interaction model (lobby gate, Stories swipe, auto-advance, particle burst) is replaced; its identity stays.
- Spectacle frames the data and never decorates it. Financial information stays flat, calm and readable.
- **First visit: a closed-curtain welcome** (owner decisions 2026-10-10, replaces "never gates the feed"). It is an introduction, not the feed: no tab bar; a compact desktop header (Explore, How it works, Watchlist); a minimal phone header. Cue greets the visitor beside the RELAY marquee with "Meet the traders. Follow the evidence.", "Discover Solana traders, explore their public ideas, and see the activity we can verify.", "Explore traders" and a separate "Try the demo". The curtains open only on Explore. On short screens it scrolls rather than crops. Deep links and returning visitors skip it; returning visitors get the short once-per-session opening, which is off under reduced motion. "Follow the plan. See the proof." stays with Relay-native plan sections.
- **Cue, the usher mascot:** a purple gecko in a burgundy usher jacket, always drawn from the owner's Figma poses, never redrawn. Cue leads the storytelling moments (welcome, end of feed, demo, empty and error states) and stays small and supportive around plans and trades. Cue never says a trade is good, never celebrates a result, and never appears with invented numbers.
- **Demo vs real:** the only fictional walkthrough is `/demo` (Mika, simulated prices), always bannered "Fictional demo · simulated prices · no real trades". It shows a fictional public post beside a fictional Relay plan, each labelled, so the difference is visible. It never writes to the real watch list or calls the API. Until real trader sources exist, Relay shows no selected-trader profiles at all rather than ten real-looking ones.

## Evidence on Hand

- **Connected:** onchain plans, versions and hashes from the Relay program on a Surfpool fork (`GET /feed`, `GET /plans/:pda`); verified follow receipts and failed attempts by wallet (`GET /me/executions`); advisory prices (`GET /prices`).
- **Derived in the app:** the Traders list and profiles group the feed's plans by the wallet that signed them (the server has no creator or search route yet).
- **Not connected yet:** the 10 selected traders and their public sources (no ingestion, no source table); public posts; other on-chain activity for a wallet; linked-wallet proofs (Phase 16); follower receipts per plan; public explorer links on the local fork.
- Fictional: demo creators created by `server/scripts/seed-demo.ts` are flagged `is_demo` and must be badged. A dev-only preview fixture feed (`?preview=fictional`) is allowed, badged FICTIONAL PREVIEW on every card, and contains no signatures, receipts or follower results.
- Absent and never to be fabricated: real-looking traders or portraits, follower results, PnL, signatures, receipts, testimonials, endorsements.

## Product Principles

1. Truth before persuasion: every number has a source and an age; missing data is shown as missing.
2. The follower authorizes every trade; Relay never acts for them and never says "buy now".
3. No pressure mechanics: no auto-advance, no ranking by return, no confetti, no pulsing numbers.
4. The theatre is the frame, the data is the play.

## Accessibility & Inclusion

- WCAG AA text contrast on the dark stage; status never relies on color alone.
- Full keyboard use of the feed; ARIA feed pattern; polite announcements for status changes on the active card only.
- `prefers-reduced-motion` turns off the curtain, bulb chase, spotlight easing and smooth scrolling.
