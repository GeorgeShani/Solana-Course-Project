# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Followers (primary):** adult Solana spot traders who already follow trade ideas from creators on X or Telegram. They arrive on a phone, often between other apps, and want to know in a few seconds whether a creator's plan still applies to them.
- **Creators (secondary):** people who publish trade plans and want a public, tamper-evident record of what they said and when, plus evidence of how followers actually did.

## Product Purpose

Relay is a mobile-first feed of creator trade plans that answers one question: _"Is this trade idea still available to me, and what happened after people actually followed it?"_

Success means a follower can read a plan's entry status correctly in 2–5 seconds, understand that it is not a recommendation, and, if they choose, review and approve one swap themselves that the program records as a verified receipt.

## Positioning

The unit of truth is the follower's own execution against a specific, immutable plan version, not the creator's claimed PnL. Plans are committed onchain (append-only versions with a hash chain), and a follow receipt can only exist if a real in-range swap happened in the same transaction. Screenshots and "+20%" claims cannot show this.

## Operating Context

- A vertical, card-by-card feed (no auto-advance), opened straight onto the first card.
- Bottom tabs: Feed, Search, My Plans, Account. Publishing is an action, not a tab.
- Watching a plan needs no wallet; it is stored in the browser.
- A wallet is requested only to review a trade or publish a plan.
- The demo runs on a local Surfpool mainnet fork in desktop Chrome at a 390×844 viewport with a labelled local burner wallet.

## Capabilities and Constraints

- **Entry-status vocabulary (exact, shared by UI, API, docs and tests):** In plan range · In plan range · closes in N min · Original entry passed · Below plan range · Plan expired · Closed by creator · Price may be outdated · Price unavailable. Each always has an icon, a shape, words and a visible hint. "Eligible" is never used.
- Entry status is advisory (feed price) and never described as safe, recommended or profitable. The binding check is onchain.
- Money is integer units; prices are shown with tabular numerals.
- Stack is fixed: TanStack Start, Hono, Postgres, Anchor, Bun, `@solana/kit`.
- The server is required for the feed; when it is down the app says so instead of showing stale or invented data.
- Undecided: light theme (MVP-later), search, creator profiles beyond a header.

## Brand Commitments

- **Theatre identity, recolored in Solana colors** (owner decision 2026-10-09): opening curtain, the RELAY marquee with chasing bulbs, a restrained spotlight behind the active card, and a closing-curtain / end-of-feed moment.
- The original showcase reference is the `curtain-sol` prototype (theatre components in `app/components/theatre/*`). Its interaction model (lobby gate, Stories swipe, auto-advance, particle burst) is replaced; its identity stays.
- Spectacle frames the data and never decorates it. Financial information stays flat, calm and readable.
- **First visit: a closed-curtain welcome** (owner decision 2026-10-10, replaces "never gates the feed"). Cue, Relay's usher, greets the visitor with RELAY, "Follow the plan. See the proof.", one paragraph, "Explore the plans" and a separate "Try a demo". The curtains open only on that click. Deep links and returning visitors skip it; returning visitors get the short once-per-session opening, which is off under reduced motion.
- **Cue, the usher mascot:** a purple gecko in a burgundy usher jacket, always drawn from the owner's Figma poses, never redrawn. Cue leads the storytelling moments (welcome, end of feed, demo, empty and error states) and stays small and supportive around plans and trades. Cue never says a trade is good, never celebrates a result, and never appears with invented numbers.
- **Demo vs real:** the only fictional walkthrough is `/demo` (Mika, simulated prices), always bannered "Fictional demo · simulated prices · no real trades". It never writes to the real watch list or calls the API.

## Evidence on Hand

- Real: onchain plans, versions, hashes and receipts from the Relay program on a Surfpool fork; the feed and plan APIs (`server/`).
- Fictional: demo creators created by `server/scripts/seed-demo.ts` are flagged `is_demo` and must be badged. A dev-only preview fixture feed (`?preview=fictional`) is allowed, badged FICTIONAL PREVIEW on every card, and contains no signatures, receipts or follower results.
- Absent and never to be fabricated: real-looking traders or portraits, follower results, PnL, signatures, receipts, testimonials.

## Product Principles

1. Truth before persuasion: every number has a source and an age; missing data is shown as missing.
2. The follower authorizes every trade; Relay never acts for them and never says "buy now".
3. No pressure mechanics: no auto-advance, no ranking by return, no confetti, no pulsing numbers.
4. The theatre is the frame, the data is the play.

## Accessibility & Inclusion

- WCAG AA text contrast on the dark stage; status never relies on color alone.
- Full keyboard use of the feed; ARIA feed pattern; polite announcements for status changes on the active card only.
- `prefers-reduced-motion` turns off the curtain, bulb chase, spotlight easing and smooth scrolling.
