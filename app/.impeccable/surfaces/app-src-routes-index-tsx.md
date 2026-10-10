---
version: 1
slug: "app-src-routes-index-tsx"
primary_target: "app/src/routes/index.tsx"
related_targets: ["app/src/components/feed","app/src/components/theatre"]
---

# Feed (`/`) — theatre redesign surface brief

Mode: Operate for the card data, Experience for the theatre frame (curtain, marquee, spotlight, stage, closing scene). Code-led build (project default). Direction pinned by the owner on 2026-10-10: faithfully reproduce the `curtain-sol` reference's visual world (`app/theatre.css`, `app/components/theatre/*`), with Solana purple/green as careful accents. No direction roll was run because the brief pins the direction; seed key: none (owner-pinned).

## Audience and job
A Solana spot follower on a phone (desktop Chrome 390×844 for the demo) checks, act by act, whether a creator's real onchain plan still applies. Read order: entry status, then pair and entry range, then expiry, then creator, then rationale. Watching needs no wallet. Users scroll at their own pace: native vertical scroll-snap, no auto-advance, no horizontal-only navigation.

## States and ranges
1–30 acts per page from `GET /feed` (real onchain plans; `is_demo` creators badged "Demo"). Statuses in the exact vocabulary. Feed states: SSR first page, loading, empty, service unavailable (server down), stale, Solana unreachable, dev-only fictional preview (`?preview=fictional`, every act badged and never mixed with real data). Details ("View plan") opens the Script sheet with the version history from `GET /plans/:pda`.

## Boundaries
No fictional faces: the reference's cast photographs are not ported. Every creator's portrait is their deterministic sigil inside the arched brass frame. No follower numbers, record dots or PnL invented. Review trade stays disabled with its reason until Phase 7. The reference's lobby gate, Stories swipe, 12 s auto-advance, tap zones, ticker and particle burst are not ported.

## Direction contract
THESIS: Each plan is an act on a real stage: burgundy velvet drapes gathered at the wings under a scalloped valance with brass trim, a warm limelight cone that swings onto the act, a perspective stage floor. The programme (status, range, expiry) stays flat and legible on a velvet plaque. Refuses the neon-crypto dashboard of glowing gradient cards and the flat dark app with a tiny glowing logo.
OWN-WORLD: The reference palette verbatim: velvet #1b1035 to deep #0f0820 under a #2a1752 radial, curtain #8a1734 / #3d0718 / #c2304f in repeating folds, brass #d6b26a hems and bead fringe, limelight #ffd98a, chalk #f6f1ff, haze #b9aed8, ember #ff9b73. Solana accents only where they carry meaning: Solana green #14F195 is the "In plan range" cue ink, the purple→green gradient marks the active tab and the sigil inks. Big Shoulders Display 800 for RELAY, names, pairs and the finale; the system text stack on the Apple text scale with tabular numerals for everything read. Brass-bordered marquee with warm chasing bulbs; arched brass portrait frames; glass pills.
STORY: The curtain parts once per session and the RELAY marquee settles into the header; the first act is already lit. The visitor reads whether the original entry still applies, how far price sits from the plan band, and when the window closes; watches it or opens the script; scrolls to the next act. At the end the drapes close, "Fin." glows, the curtain call shows the creators and the watched plans, with replay and discovery.
FIRST VIEWPORT: Valance (56 px) carrying the brass marquee sign RELAY between two bulb rows, cluster chip at right; gathered burgundy drapes at both wings (≈7% each). Centred column: arched brass portrait (sigil, name plate, Demo badge), handle · pair · version line, pair "SOL / USDC" in display type with "Buy plan" and the entry range, the status plaque (cue pill with icon and words, range bar with price marker, "Now $X · updated Ns ago", hint), the expiry pill with countdown, a two-line rationale, then Watch and View plan in the thumb zone with Review's reason. Limelight cone from the valance onto the portrait; perspective floor under the act. Tab bar: Feed, Search, My Plans, Account. At ≥900 px the act becomes a two-column stage: portrait left, programme right.
FORM: Owner-pinned reference reproduction (curtain-sol theatre), position 1 of 1; seed key: none (pinned, roll not run).
Signature interaction: on each newly active act the spotlight swings in from the scroll direction (±14°, 0.9 s, reference easing) and the portrait rises into its light; data never animates. The curtain opens in ≤ 1.2 s with the marquee shrinking into the header (skippable, never blocks input, once per session); the finale closes the drapes over the stage and stages the curtain call. All off under reduced motion.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
