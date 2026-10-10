---
version: 1
slug: "app-src-routes-index-tsx"
primary_target: "app/src/routes/index.tsx"
related_targets: ["app/src/components/feed"]
---

# Feed (`/`) — Phase 6 surface brief

Mode: Operate for the card data, Experience only for the brand frame (curtain, marquee, spotlight, closing curtain). Code-first build. Direction is pinned by the owner (theatre identity recolored in Solana colors, plan section G); no direction roll was run.

## Audience and job
A Solana spot follower on a phone (desktop Chrome 390×844 for the demo) checks, card by card, whether a creator's plan still applies. Primary read: the entry status; then pair and range; then creator; then rationale. Watching needs no wallet.

## States and ranges
1–30 cards per page; statuses in the exact vocabulary (in_range, closing soon, above_range, below_range, expired, closed, price_stale, price_unavailable). Versions 1–16. Rationale 0–1000 bytes or "text unavailable". Feed states: SSR first page, loading more, empty, service unavailable, stale (API unreachable after data loaded), Solana unreachable, fictional preview (`?preview=fictional`, dev only).

## Boundaries
No Details sheet, Review flow, wallet, publish, search or plan page (Phase 7+). Follower evidence is not in the feed API yet: the evidence line shows onchain commitment facts and says follower results are not in this view. Never invent follower numbers.

## Direction contract
THESIS: Relay is a stage; each plan is one act lit in turn. The frame performs, the programme sheet (the data) stays flat and still. Refuses the neon crypto dashboard of glowing gradient cards and the TikTok overlay of text on a moving backdrop.
OWN-WORLD: Velvet near-black with a purple cast (#0B0716 ground, #140D24 and #1C1430 raised), chalk text #F3EEFF, haze secondary #B9AFD6. Solana purple #9945FF and green #14F195 own the frame only: marquee bulbs, the spotlight cone, the active tab rule, the primary button. Status inks: green (in range), amber (entry passed), cyan (below), lavender-grey (expired/closed), dashed outline (price states). Red only for errors. Big Shoulders Display for RELAY, pairs and names; Schibsted Grotesk with tabular numerals for everything read. Hairline borders tinted by the brand gradient; flat panels; drawn stroke icons.
STORY: The visitor sees immediately whether the original entry still applies, why (range bar with the price marker), how fresh the price is, and when the window closes. They can watch it without a wallet and move on. At the end the curtain closes: they are caught up.
FIRST VIEWPORT: Top: a 56 px marquee bar, RELAY lettered in display type between two rows of small purple/green bulbs, cluster chip at right. Middle: one full-height card on a stage: creator line (sigil, name, handle, age, version chip, FICTIONAL badge when demo), pair at ~34 px display, entry range, then the flat status panel (icon + headline + range bar + "Now $X · updated Ns ago" + hint), window line, two-line rationale, evidence line, then the action row in the thumb zone (Watch, Details, Review trade or its disabled reason). Behind the card, a soft purple→green cone from above. Bottom: 56 px tab bar (Feed, Search, My Plans, Account). On ≥900 px the column is 440 px wide, centered between flat velvet wings that fall to black and are lit only by the spotlight.
AMENDMENT (owner, finish round 2): "gathered velvet drapes" is dropped. Curtain halves, valance, closing drapes and wings are flat velvet (no fold stripes, no bead fringe, no raster imagery); the meeting edges carry a single hairline. Restraint over imitation material.
FORM: Pinned owner direction (theatre stage, Solana recolor), position 1 of 1; seed key: none (pinned, roll not run).
Signature interaction: the spotlight eases onto the card that becomes active while the range-bar marker slides to its price; the curtain opens once per session in ≤1.2 s (skippable, never blocks input) and the end-of-feed card draws the drapes closed. All off under reduced motion.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
