---
name: Relay
description: A lit theatre stage where each real onchain trade plan is one act, read on a flat velvet programme plaque.
colors:
  velvet: "#1b1035"
  velvet-deep: "#0f0820"
  velvet-2: "#1d1236"
  velvet-3: "#251746"
  velvet-4: "#2f1e57"
  ink-well: "#12091f"
  plaque: "#170d2c"
  glass: "rgba(36, 22, 70, 0.72)"
  chalk: "#f6f1ff"
  haze: "#b9aed8"
  mute: "#a297c8"
  hairline: "rgba(246, 241, 255, 0.14)"
  hairline-strong: "rgba(246, 241, 255, 0.26)"
  curtain: "#8a1734"
  curtain-dark: "#3d0718"
  curtain-light: "#c2304f"
  brass: "#d6b26a"
  limelight: "#ffd98a"
  limelight-hover: "#ffe3a6"
  bulb: "#fff3cf"
  sol-purple: "#9945ff"
  sol-purple-light: "#b98cff"
  sol-green: "#14f195"
  st-in: "#14f195"
  st-above: "#ff9b73"
  st-below: "#62d3f5"
  st-ended: "#b9aed8"
  st-unknown: "#d9d1f2"
  danger: "#ff7a86"
typography:
  display:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, sans-serif"
    fontSize: "clamp(4rem, 22vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "0.04em"
  headline:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, sans-serif"
    fontSize: "clamp(2.5rem, 11vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "0.01em"
  act-pair:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, sans-serif"
    fontSize: "clamp(2rem, 4.6dvh, 2.75rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "0.01em"
  marquee-word:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "0.14em"
  title:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 0.95
  section:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
  callout:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    fontFeature: "tnum, lnum"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.45
  subhead:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
  footnote:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
  mono:
    fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.9em"
rounded:
  sm: "10px"
  md: "16px"
  lg: "24px"
  pill: "999px"
  arch: "999px 999px 24px 24px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
components:
  button-glass:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.chalk}"
    typography: "{typography.subhead}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-glass-on:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.limelight}"
    rounded: "{rounded.pill}"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.limelight}"
    textColor: "{colors.velvet}"
    typography: "{typography.subhead}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.limelight-hover}"
    textColor: "{colors.velvet}"
  button-primary-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.mute}"
  button-icon:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.pill}"
    size: "44px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.chalk}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  badge:
    backgroundColor: "transparent"
    textColor: "{colors.limelight}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
  status-plaque:
    backgroundColor: "{colors.plaque}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  status-pill-in:
    backgroundColor: "{colors.st-in}"
    textColor: "{colors.velvet-deep}"
    typography: "{typography.subhead}"
    rounded: "{rounded.pill}"
    padding: "3px 12px 3px 8px"
  portrait:
    backgroundColor: "{colors.ink-well}"
    rounded: "{rounded.arch}"
    width: "clamp(84px, 15dvh, 176px)"
  script-sheet:
    backgroundColor: "{colors.velvet-2}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.lg}"
  tab-bar:
    backgroundColor: "rgba(15, 8, 32, 0.96)"
    textColor: "{colors.haze}"
    typography: "{typography.label}"
    height: "56px"
---

# Design System: Relay

## Overview

**Creative North Star: "The Lit Stage, the Flat Programme"**

Relay is a small theatre at night. A purple stage sits under a warm radial wash; burgundy velvet drapes in repeating folds are gathered at both wings with a brass hem and a bead fringe; a scalloped valance with a brass trim carries a lit marquee sign spelling RELAY between two rows of bulbs; a limelight cone falls from the valance onto the current act; a perspective floor recedes beneath it. The world is ported from the curtain-sol reference, with Solana purple and green admitted only where they carry meaning.

Each trade plan is one act, one screen tall, snapped vertically at the reader's own pace. The act's cast (an arched brass portrait holding the creator's sigil and a name plate) lives in the theatre; the act's programme (entry status, range bar, current price, expiry) lives on a flat velvet plaque that no light, glow or gradient touches. The theatre carries the mood; the plaque carries the facts. Density is low: one act, one decision, read in a few seconds.

Motion belongs to the theatre, never to the numbers. The curtain parts once per session, the spotlight swings onto each newly active act, the portrait rises into its light, and at the end the drapes close over a "Fin." and a curtain call. All of it is off under reduced motion.

**Key Characteristics:**

- Theatre materials (velvet, curtain, brass, limelight) frame; a flat plaque (#170d2c) holds every number.
- Big Shoulders Display 800 for the marquee, names, pairs and the finale; the system text stack on the Apple text scale for everything read.
- Pills everywhere for controls; an arch (round top, 24px base corners) for portraits.
- Solana green is the "In plan range" cue ink; the Solana gradient appears only on the active tab.
- Creators are sigils, never faces.
- 8pt spacing with 4pt half-steps; 44px minimum touch targets.

## Colors

A night-purple stage, burgundy velvet and warm brass, lit by limelight, with Solana purple and green held back for meaning.

### Primary

- **Limelight** (`limelight`): the light of the stage. The primary button fill, links, focus ring, text selection, caret, badge text, the marquee word and the "Fin." glow. Its hover lifts to **Pale Limelight** (`limelight-hover`).
- **Brass** (`brass`): the trim of the theatre. Valance hem, drape hems and bead fringe, portrait and avatar frames, marquee sign border, badge border, the script sheet's top edge, the scrollbar thumb (at 40%), and the tab bar's top hairline (at 32%).

### Secondary

- **Curtain Burgundy** (`curtain`), **Curtain Shadow** (`curtain-dark`), **Curtain Highlight** (`curtain-light`): only in the drape folds (a 56px repeating dark→mid→light→mid→dark band) and the valance scallops. Never behind text.
- **Marquee Bulb** (`bulb`): the bulb bodies, haloed in limelight.

### Tertiary

- **Solana Green** (`sol-green` / `st-in`): the "In plan range" cue ink: the filled status pill and its range band. One of the five sigil inks.
- **Solana Purple** (`sol-purple`, `sol-purple-light`): the gradient's start on the active tab indicator; the lighter purple is a sigil ink.

### Neutral

- **Stage Velvet** (`velvet`): page background; under the theatre's radial (#2a1752 at top, velvet at 55%, velvet-deep at the edge).
- **Deep Velvet** (`velvet-deep`): the radial's edge; text on limelight and on the filled green pill.
- **Programme Plaque** (`plaque`): the flat status plaque, and the 3px knockout ring around the range marker.
- **Velvet Steps** (`velvet-2`, `velvet-3`, `velvet-4`): the script sheet and watchlist rows sit on velvet-2.
- **Ink Well** (`ink-well`): the inside of portrait and avatar frames.
- **Glass** (`glass`): glass pill fill with a 12px backdrop blur.
- **Chalk** (`chalk`): primary text. **Haze** (`haze`): secondary text, hints, bylines, inactive tabs. **Mute** (`mute`): tertiary text and disabled labels.
- **Hairline** (`hairline`, `hairline-strong`): 1px borders, dividers, dashed disabled outlines, the sheet handle.

### Status inks

The fixed status vocabulary maps to five tones, each always paired with an icon, a pill shape and words: in (`st-in`, filled pill), above (`st-above`, ember outline), below (`st-below`, cyan outline), ended (`st-ended`, haze outline, for expired and closed), unknown (`st-unknown`, dashed outline, for stale and unavailable prices). `danger` is reserved for destructive or error text. Ember (`st-above`) also marks warning banners and stage error details.

### Named Rules

**The Flat Programme Rule.** Data never sits on a gradient or under a glow. Every price, range and status sits on the flat plaque or plain velvet; theatre materials, the spotlight and every text-shadow stay off it.

**The Green Means In Rule.** Solana green appears as cue ink only: the "In plan range" pill and band (and as one sigil ink). The purple→green gradient appears in exactly one place: the active tab's 2px indicator.

**The Words Plus Shape Rule.** A status is never color alone: icon, pill shape (filled, outlined, dashed) and the exact headline words travel together.

## Typography

**Display Font:** Big Shoulders Display Variable (with Big Shoulders Display, sans-serif)
**Body Font:** the system text stack (-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif)
**Label/Mono Font:** ui-monospace, SF Mono, Menlo (code and kbd only)

**Character:** A condensed, heavy marquee face for what is billed (RELAY, creator names, pairs, "Fin."), set tight at 0.88 line height; the platform's own text face for everything read, on Apple's text-style sizes.

### Hierarchy

- **Display** (800, clamp(4rem, 22vw, 6rem), 0.88, +0.04em): the opening marquee sign; "Fin." uses the same face at clamp(5rem, 30vw, 6rem) in limelight.
- **Hero** (`--h-hero`, clamp(2rem, 6vw, 2.5rem)): the record page title and walkthrough scene titles.
- **Page** (`--h-page`, clamp(1.75rem, 5vw, 2rem), line height 1): page titles. Section headings use `--h-section` (1.25rem) and card titles `--h-card` (1.0625rem). The scale follows the Figma design system's proportions: page titles stay close to body size, so the stage, not the type, carries the drama.
- **Headline** (800, clamp(2.25rem, 9vw, 3rem), 0.88): stage message titles only.
- **Act Pair** (800, clamp(2rem, 4.6dvh, 2.75rem), 0.88; 3.25rem at ≥900px): the pair on each act ("SOL / USDC"). Portrait name plates use the same face at min(2rem, 21cqi).
- **Marquee Word** (800, 1.375rem, +0.14em): RELAY in the valance sign.
- **Title** (800, 1.75rem, 0.95): the script sheet title.
- **Section** (700, 1.25rem): page section headings.
- **Body** (400, 1.0625rem, 1.45): default text. Rationale runs at subhead size, max 34ch (52ch on desktop), clamped to two lines.
- **Callout** (700, 1rem, tabular): the current price ("Now $X").
- **Subhead** (600, 0.9375rem): buttons, status pill (700), chips, ranges.
- **Footnote** (0.8125rem): bylines, hints, price age, banners.
- **Label** (600, 0.75rem): tab labels, badges, version line, range labels, Review's reason.

### Named Rules

**The Tabular Read Rule.** Every number a reader compares (prices, ranges, counts, countdowns) uses tabular lining numerals.

**The Billing Face Rule.** Big Shoulders is for what is billed on the marquee: the brand, names, pairs, titles, "Fin.". It never sets a price, a hint or a sentence.

## Layout

A fixed three-row app: the valance (56px plus the top safe area), the stage (fills), the tab bar (56px plus the bottom safe area, phones only; zero on desktop, and covered by the welcome scene). Drapes occupy the wings at 7.5% each (`--wing`), and every column pads past them (wing + 8–24px).

The feed is native vertical scroll-snap (mandatory, stop always), one act per full stage height, no auto-advance. On phones the act is a centred single column: portrait, byline, pair and range, the status plaque (stretched, max 420px), expiry beside the status pill, rationale, then actions pushed to the thumb zone with `margin-top: auto`. Gaps are 8px, growing to 12px on tall screens (≥900px high); below 760px high the rationale clamps to one line, below 680px the evidence line hides, and when a banner shows the portrait shrinks to 12dvh so the plan's terms keep their room.

At ≥900px wide the act becomes a two-column stage that stands on the floor horizon: cast column 240px left, programme up to 460px right, left-aligned, bottom-aligned, with a bottom padding of 20dvh so nothing crosses the floor's edge; the spotlight shifts 230px left onto the portrait, and a keyboard hint appears bottom right. Content pages cap at 760px (`--page-w`), or 1080px (`--page-w-wide`) for Traders, profiles and records; the script sheet at 520px (a bottom sheet on phones, a centred brass-bordered dialog on desktop).

Spacing is an 8pt grid with 4pt half-steps (4, 8, 12, 16, 24, 32, 48).

## Elevation & Depth

Depth is theatrical: layered planes (stage radial, floor in perspective, drapes, valance, tab bar) rather than card elevation. Shadows are dark and soft, used to seat materials on the stage; warm glows belong only to light sources (bulbs, marquee, limelight button, portrait frame) and never to data.

### Shadow Vocabulary

- **Valance drop** (`box-shadow: 0 6px 18px rgba(0,0,0,0.5)`): the valance over the stage.
- **Marquee glow** (`box-shadow: 0 4px 18px -6px rgba(0,0,0,0.7), 0 0 28px -10px rgba(255,217,138,0.6)`): the valance sign; the opening sign uses `0 0 60px -10px rgba(255,217,138,0.55)`.
- **Bulb halo** (`box-shadow: 0 0 6px 2px rgba(255,217,138,0.85)`): marquee bulbs (4px 1px at the valance size).
- **Portrait lift** (`box-shadow: 0 20px 60px -20px rgba(0,0,0,0.8), 0 0 40px -12px rgba(255,217,138,0.45)`): the arched frame in the light.
- **Plaque seat** (`box-shadow: 0 16px 40px -24px rgba(0,0,0,0.9)`): the status plaque. Dark only.
- **Limelight press** (`box-shadow: 0 8px 24px -10px rgba(255,217,138,0.7)`): the primary button.
- **Sheet rise** (`box-shadow: 0 -20px 60px -20px rgba(0,0,0,0.8)`): the script sheet, over a 50% black backdrop.
- **Wing shadow**: drapes cast a 90° gradient from rgba(8,3,18,0.55) to transparent across wing + 28px.

### Named Rules

**The Light Sources Glow Rule.** Only things that emit light (bulbs, the marquee word, the limelight button, the portrait in the spotlight, "Fin.") carry a warm glow. Plaques and numbers sit in a dark seat shadow or none.

## Shapes

Controls are full pills (999px): buttons, chips, badges, status pills, the range track and band, the cluster chip, the skip link. Portraits are arches: a fully rounded top over 24px base corners, framed by a 2px brass border; avatars are brass-ringed circles; stage message placeholders are the same arch in a 2px dashed brass. Containers use 16px (plaque, watchlist rows) or 24px (sheet, sign); small boxes (valance sign, banners, stage details) use 10px. The valance is scalloped (72px radial scallops) over a 3px brass hem; drapes end in a 6px brass inset hem and a 14px bead fringe. Dashed strokes mean "not known or not available": unknown status, offline plaque, priceless range track, disabled buttons.

## Components

### Buttons

Glass and limelight pills that feel like lit tickets.

- **Shape:** full pill (999px), three control heights: 48px (`--ctl`, large: primary page actions, the trade input), 44px (`--ctl-sm`, default) and 40px (`--ctl-xs`, small: rows, header, tabs). Default padding 16px, subhead 600; small uses 12px padding at footnote size; large 24px at callout size.
- **Ghost:** transparent with haze text for the secondary action in a row; a hairline appears on hover. A danger tone exists for Disconnect.
- **Primary (limelight):** limelight fill, velvet text, no border, limelight press shadow. Hover (hover-capable devices) lifts to pale limelight. Disabled turns transparent with a 1px dashed strong hairline and mute text, and is never hidden: its reason sits beneath it.
- **Glass:** glass fill with a 12px backdrop blur, 1px hairline border, chalk text. Hover darkens to rgba(52,33,98,0.86) with a strong hairline. Pressed/on state (`data-on`) borders in 60% limelight with limelight text. Disabled uses mute text and a dashed border.
- **Icon:** a 44px glass circle. On phones the Watch button collapses to this star circle with its name kept in the accessible label.
- **Press:** all buttons scale to 0.97 on active (100ms); color transitions run 200ms on the house ease.
- **Focus:** 2px limelight outline, 3px offset (global).

### Inputs, Tabs and Switches

- **Field:** a subhead label above a 48px input (10px radius, velvet-3 fill, hairline, callout size), a footnote hint below and an ember error with `aria-invalid`. Focus is the global limelight outline.
- **Tabs:** a pill track (velvet-2, hairline) of 40px pill tabs; the selected tab is chalk on velvet-4 with a limelight count. Tabs are a real ARIA tablist: arrow keys, Home and End move selection, and the URL (`?tab=`) holds the state.
- **Switch:** a 48×28 pill with a 20px thumb, `role="switch"` with `aria-checked`; on is limelight. Used for the Cue cursor preference.

### Chips and Badges

- **Chip:** hairline-bordered pill, 4px 12px, chalk text; quiet variant in haze at footnote size; button variant 40px high on glass.
- **Badge:** brass-bordered pill with limelight label text (0.75rem 600), used for "Demo" and "Fictional preview".

### Status Plaque (signature)

The programme. A flat #170d2c plaque, 16px radius, 1px hairline, 12px 16px padding, dark seat shadow, left-aligned. It holds the status pill (20px icon plus the exact headline), the expiry pill beside it, the always-visible hint, the range bar and "Now $X · updated Ns ago". The pill is filled Solana green with deep velvet text for "In plan range", outlined at 1.5px in the tone ink otherwise, dashed for unknown prices. The plaque border turns dashed when offline.

### Range Bar

An 8px pill track at 8% chalk (dashed outline when there is no price); the plan band fills at 34% of the tone ink with a 70% inner outline; a 4×22px chalk marker with a 3px plaque knockout ring marks the price, with a chalk arrowhead when clamped beyond the track. Labels are caption, haze, tabular. The marker's left position eases in 250ms; nothing else moves.

### Portrait and Sigil (signature)

An arched brass frame (3:4) over the ink well, holding the creator's deterministic sigil: a 5×5 mirrored grid of rounded cells inside a #2A1A4F disc, inked from five colors (#F6D98B, #14F195, #FF9466, #B98CFF, #F4EEFF). A gradient name plate at the base sets the stage name in the billing face. Ended plans dim the sigil (grayscale 0.4, brightness 0.9).

### Navigation

- **Valance:** scalloped burgundy with a brass hem; centre is the small marquee sign (RELAY between two 7-bulb rows, brass border, ink-well fill), right is the brass-ringed cluster chip.
- **Header (≥900px):** the valance is also the header, a 1fr / sign / 1fr grid. Left: Discover, Traders, Watchlist, How it works on a dark rail (rgba(15,8,32,0.86), 1px 40% brass border, pill) so they read over the scallops: 36px pills, footnote 600, haze; hover lifts to chalk on 8% chalk; pressed 14% chalk; current is limelight text on 14% limelight with `aria-current="page"`. Right: the cluster chip, the Cue cursor switch (a 40px circle holding the mascot, grey when off; shown only for a fine hover pointer), an Account icon link and the wallet control. The welcome shows none of it.
- **Wallet control:** a 40px header pill. Disconnected it reads "Connect wallet" and opens the wallet dialog; connected it shows a green dot and the short address and opens a disclosure popover (wallet name and address, Copy address, Account, Disconnect). An outside click or Escape closes it; Escape returns focus to the control.
- **Wallet dialog:** a centred velvet-2 native `<dialog>` (max 420px, 24px radius, blurred 70% backdrop, rising 260ms) that walks choose → connecting → connected, cancelled, failed or missing. Detected Wallet Standard wallets are 56px option rows with their icon; "Connecting" names the wallet and says nothing will be signed; cancel and failure say what happened in one sentence with Try again; the missing state explains what a wallet is with links to get one. Connecting never asks for a signature.
- **Tab bar (phones, inside the app only):** four tabs (Discover, Traders, Watchlist, Account) on rgba(15,8,32,0.96) under a 32% brass hairline; labels at 0.75rem 600 in haze, chalk on hover and when current; the current tab carries a 2px Solana gradient indicator on its top edge (inset 28% each side). Hidden on the welcome and on desktop. On phones the wallet lives on Account and in the trade panel, not in the header. The stage, drapes and floor all reserve `--tabbar-space`, so the bar never covers content.
- **Back:** a 44px haze pill with a chevron above page titles; it goes back in history, or to a named fallback when the page was opened directly.

### Record Kinds

A small pill (caption 600, 14px icon, words) on every record: **Public post** (dashed hairline, haze: an idea, not proof), **On-chain activity** (solid strong hairline, chalk), **Published through Relay** (solid 75% brass, limelight), **Fictional demo** (dotted ember). The border style carries the kind as much as the colour does. Demo creators also keep the brass "Demo creator" badge; wallets with no Relay profile get a quiet "Wallet only" badge.

### Traders, Profiles and Records

- **Panel:** the shared content surface: velvet-2, 16px radius, hairline, 16–24px padding, a section heading. Content pages widen to `page--wide` (up to 1080px) where a two-column layout earns it.
- **Trader cards:** a responsive grid (`.tgrid`, one column on phones, auto-fill 300px+ on desktop). Each card has a brass-ringed sigil avatar, the name as a stretched link to the profile, handle and short wallet, badges, the "Published through Relay" kind pill with "Signed N plans", a latest-plan box (pair icon, status pill, age) and a Watch button that sits above the stretched link. Hover lifts the card 2px with a darker shadow. A brass callout above the grid says the ten selected traders aren't connected yet; nobody is invented to fill it.
- **Profile:** the arched portrait beside the name, handle, badges and the Watch trader pill; then a two-column grid at ≥900px: Activity (rich record rows with pair icon, kind, status and chevron) beside an aside with Identity facts and a "Not connected yet" panel. Missing values are mute italics ("None connected."), never blank.
- **Record page:** a hero (pair icon, kind pills, the pair as title, byline with chain time, Watch and Open in Discover), then a grid: status (the real plaque), What was posted, Evidence, followers, and Version history in a disclosure on the left; the trade panel in a sticky 380px side column at ≥900px. On phones the order is status, trade, then the rest.

### Trade Panel

Following a plan, laid out like a swap card (Jupiter was the reference for proportions). The head names the network with a dot ("Local fork", "Devnet") before anything is signed. Two stacked boxes: "You pay" (a tabular amount input with the quote token chip, the wallet balance when known, and the per-follow limits or the amount error beneath) and "You receive" (the quoted estimate and "At least X, or the trade fails instead"), joined by a small arrow. Ruled rows carry the plan's range and timing; after a quote, "Fees and route" is a disclosure (network, priority and receipt-account fees in SOL, the route). A network note says what this cluster is and that Relay sends the signed transaction itself. One large primary button walks the state: Connect wallet → Get quote → Approve in the wallet → a three-step progress list (Approve in wallet, Confirm on network, Verify receipt) → the outcome. A failure keeps its words in an ember alert and is never shown as success. When the plan is out of range, expired or a fictional preview, the boxes dim and the button is disabled with its reason.

### How It Works

Three scenes (Discover a trader, Watch what matters, Check the evidence) behind a step indicator (`aria-current="step"`). Each scene is Cue in a pose beside a title, one or two sentences and a small live example marked "Example · fictional": a trader card, a Watch toggle Cue reacts to, and four expandable record kinds. Back / Next, Skip, and "Try the demo" on the last scene; arrow keys page between scenes and focus moves to the new title. On phones Cue sits beside the copy and the nav sticks to the bottom so the buttons stay in view. "What Relay won't do" and "Connected today" are disclosures below.

### Watchlist

A tablist (Traders, Records, History) with counts and a "Stored in this browser only" note. Rows are velvet-2 cards: traders with avatar, demo badge, new-plan count, latest plan and source; records with pair icon, status, "changed" marks and a missed-entry Cue. The empty state is Cue hugging the bookmark, one sentence and "Explore traders". History is a wallet lookup (prefilled from the connected wallet) listing receipts and failed follows exactly as recorded.

### Account

Wallet (connected: name, address, Follow history, Disconnect; otherwise Connect and "How to get one"), Preferences (the Cue cursor switch, with an error if storage is blocked), Network, and a Cue panel with Meet Cue again and Try the demo.

- **Notice:** missing data and errors on pages: a dashed brass (ember for errors) velvet-2 box with Cue's cable pose at 72px, a title, subhead text and underlined limelight links.

### Script Sheet

The plan's full script (Layer 2): a velvet-2 bottom sheet with a 2px brass top edge, 24px top corners, a 40×4px handle, rising 260ms. Terms and history are hairline-ruled definition rows (7.5rem label column). History entries hang off a 50% brass left rule. On desktop it centres with a full brass border and no handle.

### Stage Messages and Finale

Empty and error states stand on the stage with Cue (discover pose when empty, the cable pose when the service is unavailable), a headline title, haze text and glass actions. The unavailable state adds a separate link to the fictional demo. Loading keeps the dashed brass arch. The finale closes the drapes over the stage, shows "Fin." in limelight, then Cue's bow (rises 28px, settles, dips 6px about the feet over 1.6s), "That's tonight's lineup.", a curtain call of brass-ringed sigil avatars, a tally of plans by status on dark pills, the watched plans as chips, Review your Watchlist and Explore again, then Browse traders and Refresh links.

### Cue (signature)

Relay's usher: a purple gecko in a burgundy usher jacket. Seven poses come straight from the owner's Figma vectors and are never redrawn or recoloured: welcome (curtain pull, wave), discover (plan card and spotlight), saved (hugging the bookmark), missed ("Missed this entry" ticket), unavailable (tangled cable), bow ("Fin." sign, eyes closed) and the standing mascot. The art renders as an inline 400×400 SVG at a square aspect; `cue--lit` adds a warm limelight rim (drop-shadow) only. Sizes: welcome up to 280px on phones (220px on short phones) and 460px on desktop; page notices 72px; stage messages 150–230px; finale 130–240px; demo 200px on phones and 380px on desktop; plan-sheet callout 88px; watch toast 76px; Watchlist rows 64px. Cue is never placed over prices, ranges or controls, and the watch toast sits at the top of the stage so the action row stays clear.

### Cue Cursor

On desktop with a fine hover pointer, Cue can follow the pointer over decorative stage areas: a 12px limelight tip sits exactly at the hotspot and a 34px mascot hangs below it, fading in 140ms. The overlay is `pointer-events: none`. The native cursor returns over text, links, buttons, inputs, dialogs, the trade panel and anything marked `data-cursor="native"`, so aiming and reading never depend on Cue. It is off for touch or coarse pointers and under reduced motion, and the header switch (and the Account preference) turns it off and remembers that in the browser.

### Welcome

A closed-curtain scene over the stage (house lights down) that also covers the tab bar's row: a smaller brass marquee sign (the brand, with a quieter 36px glow and 7px bulbs), Cue in a limelight cone, one line, "Discover Solana traders. Explore their ideas. Check the evidence." (body size, 600, balanced, 30ch; 1.125rem and 32ch on desktop), and "Explore traders" (limelight primary) and "Try the demo" (glass). There is no header navigation, wallet or tab bar on the welcome, and it never replays on a route change; Account offers "Meet Cue again". It scrolls instead of cropping; below 700px high Cue and the sign shrink so both actions stay in view. Desktop (≥900px) is a two-column grid: Cue on the left, sign, headline and copy on the right.

### Demo

A page with a sticky dashed-brass "Fictional demo · simulated prices · no real trades" banner, Mika's two records (a fictional public post and a fictional Relay plan, each with both kind pills), Cue with a speech card (the speaker name in the billing face), the demo plan using the real status plaque and range bar, and a two-column "Since you watched" comparison. Changed values turn ember and carry the words "· changed", so colour is never the only signal.

### Motion

House ease is cubic-bezier(0.16, 1, 0.3, 1); state transitions take 200ms. Theatre motion runs through motion/react: the spotlight swings in from the scroll direction (±14°, 0.9s); the portrait rises into its light on activation (from 18px down, 0.55 opacity, 0.96 scale, 0.9s); the finale drapes close in 1.1s and the curtain call drops in staggered by 0.12s. The opening (CSS keyframes, ≤1.2s, once per session, skippable, never blocks input) gathers the drapes to scaleX(0.14) with ±2° skew and shrinks the sign into the valance. The marquee bulbs chase in 1.6s steps. The welcome opens on click: Cue hops into the discover pose (0.36s), and the drapes gather to the wings after 0.3s over 0.9s (ease 0.33,1,0.68,1) and hand off to the resting drapes. With a fine pointer only, motion-value springs shift the limelight slightly, lean Cue up to 3°, shift the drapes by up to 7px and move Cue's pupils within 5×3.5 SVG units; inside the app the resting drapes drift up to 4px and the feed's spotlight up to 18px. Nothing interactive moves, the cursor is native wherever there is something to read or press, and leaving the window springs everything back to rest. Screens use small, functional motion only: How it works slides scenes 24px (a fade under reduced motion), cards lift 2px on hover, the wallet dialog rises 260ms, and Cue reacts to a Watch. Every flow works with all of it off. Under reduced motion all of it stops (the welcome becomes a 0.2s fade), resolved hydration-safely (motion is assumed on at render and switched off once mounted).

## Do's and Don'ts

### Do:

- **Do** put every price, range, status and countdown on the flat plaque (#170d2c) or plain velvet.
- **Do** show status as icon, pill shape and the exact vocabulary together: "In plan range", "Original entry passed", "Below plan range", "Plan expired", "Closed by creator", "Price may be outdated", "Price unavailable".
- **Do** use tabular numerals for every compared number.
- **Do** represent every creator by their sigil in a brass arch or ring.
- **Do** keep disabled actions visible with their reason beneath them.
- **Do** keep touch targets at 44px minimum and focus as a 2px limelight outline offset 3px.
- **Do** run theatre motion through motion/react with the house ease, and switch it all off under reduced motion via the hydration-safe calm-motion hook.
- **Do** use the ui-monospace stack for code and kbd only.

### Don't:

- **Don't** set data on a gradient, under the spotlight cone, or under any glow or text-shadow.
- **Don't** use Solana green for anything but the "In plan range" cue (and sigil ink), or the Solana gradient anywhere but the active tab indicator.
- **Don't** show faces or photographs of creators; sigils only.
- **Don't** auto-advance acts, add a ticker, or add a particle burst.
- **Don't** animate anything continuously near prices; the bulbs chase only in the valance.
- **Don't** say "Eligible" or invent status words outside the fixed vocabulary.
- **Don't** set prices, hints or sentences in Big Shoulders Display.
