# Product

<!-- impeccable:product-schema 1 -->

Canonical product definition (restructure of 2026-10-12). Older planning documents live in [docs/archive](docs/archive) and are historical only. Active work is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Platform

web

## Definition

Relay is a **public-source trading-idea memory system.**

> **See the original idea. Follow what changed. Check the evidence.**

Primary journey: **Welcome → Discover → Trader → Idea timeline → Watch → Updates → Source / evidence.**

Optional technical proof: **Native plans → immutable terms → user-approved execution → inspectable receipt.**

Trading is secondary. Discovery and source-backed timelines are the product. Relay-native plans on Solana are a separate, optional capability that lives under **Plans**. A public post never becomes an executable plan automatically, and creator updates never authorize anything.

## Users

- **Followers (primary):** adults who already follow several traders across public sources (X, Telegram, newsletters, video) in any market. They arrive on a phone and want to know what a trader originally said, what changed, where it came from and what can actually be established.
- **Creators (secondary, later):** people who want a public, tamper-evident record of what they said and when. Claiming a profile is deferred.

## Evidence taxonomy: four kinds, never blended

| Kind                         | Label                   | What it proves                                                                                                      | What it does not prove                                                 |
| ---------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Public-source editorial item | Public post / analysis  | That an attributed public source said it, when it was published, and what Relay can support about a later relation. | That the person traded, controls a wallet, profited or endorses Relay. |
| Verified onchain activity    | On-chain activity       | A transaction on Solana, shown under a person only when the wallet association is independently supported.          | Who the wallet belongs to, unless separately established.              |
| Plan published through Relay | Published through Relay | A plan a wallet signed and committed on Solana; the only kind that can be reviewed as a trade, with receipts.       | Complete trader performance, or that a public-source profile owns it.  |
| Fictional demo / fixture     | Fictional demo          | Nothing. Invented for walkthroughs or layout checks, always visibly labelled.                                       | Anything.                                                              |

Every public record carries its exact source URL, source time, Relay's reviewed time, provenance and relationship basis. Missing data stays missing; unavailable never renders as zero.

## Real data versus fictional fixtures

1. **Public-source editorial records (primary).** `server/curation/curated.json`, loaded into Postgres, served under `/discovery`. Profiles are **unclaimed**: "Public-source profile · Not claimed by the author". Initial authorized profiles: **Arthur Hayes, Peter Brandt, Benjamin Cowen**. Coverage is manual and says so; no automatic monitoring is connected.
2. **Relay-native plans and receipts (separate technical proof).** Relay program on Solana devnet, mirrored by the server. Chain data is authoritative. Lives under Plans.
3. **Fictional preview and demo data (QA and education only).** `app/src/lib/fixtures.ts` (development builds only) and the `/demo` walkthrough. Never in the technical demo, screenshots or default navigation.

### Relationship vocabulary (discovery timelines)

A later item is tied to an original in exactly one of these ways, and the app says which:

- **Author-confirmed update:** the author's own later item explicitly refers to the original (`creator_confirmed`).
- **Later analysis on the same topic:** same author, same subject, no explicit reference (`editorially_associated`).
- **Uncertain:** Relay cannot support the link (`uncertain`).
- **Unrelated:** not shown as part of the idea.

Two items that mention the same asset are not related.

## Locked decisions

1. Public sourced ideas are Relay's primary product; native plans are optional and live under Plans.
2. `/` is Discover after onboarding. No functional route depends on `?welcome=true`.
3. New visitors see the full closed-curtain welcome first. Returning visitors enter Discover (an optional short curtain once per session, off under reduced motion). Existing users reopen the identical welcome from an explicit **Meet Cue** action. Deep links never force the welcome.
4. Dismissing the welcome is stored in this browser only (`relay:welcome:v2`). No account sync.
5. Watching is wallet-free and browser-local, and says so ("Stored in this browser only").
6. The curated dataset is version-controlled and manually reviewed. Automatic monitoring, scraping, creator claiming, notifications, premium analytics, leaderboards and inferred PnL are deferred.
7. `/?preview=fictional` is a development-only layout fixture. It is never the technical demo.
8. `docs/research/TRADER_DATA_SOURCES_2026-10.md` covers outside-Relay wallet-data providers only. It does not replace the public-source dataset and must never imply that Brandt, Hayes or Cowen control any wallet.
9. **Devnet only.** No mainnet in this project, now or later. Burner keys only on the local test fork; the owner signs everything real.

## Capabilities and constraints

- **Entry-status vocabulary (exact; shared by UI, API, docs and tests):** In plan range · In plan range · closes in N min · Original entry passed · Below plan range · Plan expired · Closed by creator · Price may be outdated · Price unavailable. Each has an icon, shape, words and a hint. "Eligible" is never used.
- Entry status is advisory (feed price), never described as safe, recommended or profitable. The binding check is onchain.
- Money is integer units; prices use tabular numerals.
- Stack is fixed: TanStack Start, Hono, Postgres, Anchor, Bun, `@solana/kit`.
- The server is required for discovery and the feed; when it is down the app says so instead of showing stale or invented data.
- A wallet is requested only to follow a plan or publish one, through the Wallet Standard. Connecting shares the address and never asks for a signature.
- Following (Plans only): amount → fresh quote → review minimum, fees, expiry, range and window → explicit approval in the wallet → Relay sends it to this build's network → pending → verified receipt, or a failure that stays a failure.

## Brand commitments

- Theatre identity, kept: curtains, burgundy, velvet purple, cream text, restrained brass, the RELAY marquee and **Cue**, the purple gecko usher, always drawn from the owner's Figma poses and never redrawn.
- Spectacle frames the data and never decorates it. **Content screens are calm:** neutral dark surfaces, system sans for reading, theatrical display type only for brand moments.
- Cue never says a trade is good, never celebrates a result, never appears with invented numbers.
- Cue cursor: desktop mouse only, over open stage only, switchable off.
- No invented traders, posts, identities, wallets, PnL, endorsements or verification badges.

## Product principles

1. Truth before persuasion: every number has a source and an age; missing data is shown as missing.
2. The follower authorizes every trade; Relay never acts for them and never says "buy now".
3. No pressure mechanics: no auto-advance, no ranking by return, no confetti, no pulsing numbers.
4. The theatre is the frame; the data is the play.

## Accessibility and inclusion

- WCAG AA contrast on the dark stage; status never relies on color alone.
- Visible focus, 44 px minimum targets, full keyboard use; polite announcements for status changes.
- `prefers-reduced-motion` turns off the curtain, bulb chase, spotlight easing, smooth scrolling, scene slides and the Cue cursor.
- Loading, empty, unavailable and error states are distinct.
