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
- **Headline** (800, clamp(2.5rem, 11vw, 3.5rem), 0.88): page titles and, at clamp(2.25rem, 9vw, 3rem), stage message titles.
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

A fixed three-row app: the valance (56px plus the top safe area), the stage (fills), the tab bar (56px plus the bottom safe area). Drapes occupy the wings at 7.5% each (`--wing`), and every column pads past them (wing + 8–24px).

The feed is native vertical scroll-snap (mandatory, stop always), one act per full stage height, no auto-advance. On phones the act is a centred single column: portrait, byline, pair and range, the status plaque (stretched, max 420px), expiry beside the status pill, rationale, then actions pushed to the thumb zone with `margin-top: auto`. Gaps are 8px, growing to 12px on tall screens (≥900px high); below 760px high the rationale clamps to one line, below 680px the evidence line hides, and when a banner shows the portrait shrinks to 12dvh so the plan's terms keep their room.

At ≥900px wide the act becomes a two-column stage that stands on the floor horizon: cast column 240px left, programme up to 460px right, left-aligned, bottom-aligned, with a bottom padding of 20dvh so nothing crosses the floor's edge; the spotlight shifts 230px left onto the portrait, and a keyboard hint appears bottom right. Content pages cap at 600px; the tab list at 560px; the script sheet at 520px (a bottom sheet on phones, a centred brass-bordered dialog on desktop).

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
- **Shape:** full pill (999px), minimum height 44px, 16px side padding, subhead 600; small variant 36px high, 12px padding, footnote size.
- **Primary (limelight):** limelight fill, velvet text, no border, limelight press shadow. Hover (hover-capable devices) lifts to pale limelight. Disabled turns transparent with a 1px dashed strong hairline and mute text, and is never hidden: its reason sits beneath it.
- **Glass:** glass fill with a 12px backdrop blur, 1px hairline border, chalk text. Hover darkens to rgba(52,33,98,0.86) with a strong hairline. Pressed/on state (`data-on`) borders in 60% limelight with limelight text. Disabled uses mute text and a dashed border.
- **Icon:** a 44px glass circle. On phones the Watch button collapses to this star circle with its name kept in the accessible label.
- **Press:** all buttons scale to 0.97 on active (100ms); color transitions run 200ms on the house ease.
- **Focus:** 2px limelight outline, 3px offset (global).

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
- **Tab bar:** four tabs (Feed, Search, My Plans, Account) on rgba(15,8,32,0.96) under a 32% brass hairline; labels at 0.75rem 600 in haze, chalk on hover and when current; the current tab carries a 2px Solana gradient indicator on its top edge (inset 28% each side).

### Script Sheet
The plan's full script (Layer 2): a velvet-2 bottom sheet with a 2px brass top edge, 24px top corners, a 40×4px handle, rising 260ms. Terms and history are hairline-ruled definition rows (7.5rem label column). History entries hang off a 50% brass left rule. On desktop it centres with a full brass border and no handle.

### Stage Messages and Finale
Empty and error states stand on the stage with Cue (discover pose when empty, the cable pose when the service is unavailable), a headline title, haze text and glass actions. The unavailable state adds a separate link to the fictional demo. Loading keeps the dashed brass arch. The finale closes the drapes over the stage, shows "Fin." in limelight, then Cue's bow (rises 28px, settles, dips 6px about the feet over 1.6s), "That's tonight's lineup.", a curtain call of brass-ringed sigil avatars, a tally of plans by status on dark pills, the watched plans as chips, Review watched plans and Explore again, then Search and Refresh links.

### Cue (signature)
Relay's usher: a purple gecko in a burgundy usher jacket. Seven poses come straight from the owner's Figma vectors and are never redrawn or recoloured: welcome (curtain pull, wave), discover (plan card and spotlight), saved (hugging the bookmark), missed ("Missed this entry" ticket), unavailable (tangled cable), bow ("Fin." sign, eyes closed) and the standing mascot. The art renders as an inline 400×400 SVG at a square aspect; `cue--lit` adds a warm limelight rim (drop-shadow) only. Sizes: welcome up to 300px on phones and 500px on desktop; stage messages 150–230px; finale 130–240px; demo 200px on phones and 380px on desktop; plan-sheet callout 88px; watch toast 76px; My Plans rows 64px. Cue is never placed over prices, ranges or controls, and the watch toast sits at the top of the stage so the action row stays clear.

### Welcome
A closed-curtain scene over the stage (house lights down): the brass marquee sign as the h1, Cue in a limelight cone, a 36ch lede, "Explore the plans" (limelight primary) and "Try a demo" (glass), and a footnote. Desktop (≥900px) is a two-column grid: Cue on the left, sign and copy on the right.

### Demo
A page with a sticky dashed-brass "Fictional demo · simulated prices · no real trades" banner, Cue with a speech card (the speaker name in the billing face), the demo plan using the real status plaque and range bar, and a two-column "Since you watched" comparison. Changed values turn ember and carry the words "· changed", so colour is never the only signal.

### Motion
House ease is cubic-bezier(0.16, 1, 0.3, 1); state transitions take 200ms. Theatre motion runs through motion/react: the spotlight swings in from the scroll direction (±14°, 0.9s); the portrait rises into its light on activation (from 18px down, 0.55 opacity, 0.96 scale, 0.9s); the finale drapes close in 1.1s and the curtain call drops in staggered by 0.12s. The opening (CSS keyframes, ≤1.2s, once per session, skippable, never blocks input) gathers the drapes to scaleX(0.14) with ±2° skew and shrinks the sign into the valance. The marquee bulbs chase in 1.6s steps. The welcome opens on click: Cue hops into the discover pose (0.36s), and the drapes gather to the wings after 0.3s over 0.9s (ease 0.33,1,0.68,1) and hand off to the resting drapes. With a fine pointer only, motion-value springs shift the limelight slightly, lean Cue up to 3°, shift the drapes by up to 7px and move Cue's pupils within 5×3.5 SVG units; nothing interactive moves. Under reduced motion all of it stops (the welcome becomes a 0.2s fade), resolved hydration-safely (motion is assumed on at render and switched off once mounted).

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
