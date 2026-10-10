---
name: Relay
description: A theatre stage lit in Solana colors; each trade plan is one act, read on a flat programme sheet.
colors:
  velvet: "#0b0716"
  velvet-2: "#140d24"
  velvet-3: "#1c1430"
  velvet-4: "#271d40"
  chalk: "#f3eeff"
  haze: "#b9afd6"
  mute: "#9d93bf"
  hairline: "rgba(243, 238, 255, 0.12)"
  hairline-strong: "rgba(243, 238, 255, 0.22)"
  sol-purple: "#9945ff"
  sol-purple-light: "#b98cff"
  sol-green: "#14f195"
  st-in: "#14f195"
  st-above: "#f6bd55"
  st-below: "#62d3f5"
  st-ended: "#b3aacd"
  st-unknown: "#c9c0e6"
  danger: "#ff7a86"
typography:
  display:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0.01em"
  marquee:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "0.32em"
  title:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.01em"
  status:
    fontFamily: "Schibsted Grotesk Variable, Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Schibsted Grotesk Variable, Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  small:
    fontFamily: "Schibsted Grotesk Variable, Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
  footnote:
    fontFamily: "Schibsted Grotesk Variable, Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Schibsted Grotesk Variable, Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.02em"
rounded:
  sm: "10px"
  md: "14px"
  lg: "20px"
  pill: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "20px"
  s6: "24px"
  s7: "32px"
  s8: "48px"
components:
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.chalk}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "48px"
  button-ghost-hover:
    backgroundColor: "{colors.velvet-4}"
    textColor: "{colors.chalk}"
  button-ghost-small:
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  button-primary:
    backgroundColor: "{colors.sol-purple}"
    textColor: "{colors.velvet}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "48px"
  button-primary-disabled:
    backgroundColor: "{colors.velvet-3}"
    textColor: "{colors.mute}"
    rounded: "{rounded.pill}"
  act-panel:
    backgroundColor: "{colors.velvet-2}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
  status-panel:
    backgroundColor: "{colors.velvet-3}"
    textColor: "{colors.chalk}"
    padding: "12px 20px 16px"
  banner:
    backgroundColor: "{colors.velvet-2}"
    textColor: "{colors.haze}"
    typography: "{typography.footnote}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  badge-fictional:
    textColor: "{colors.chalk}"
    rounded: "6px"
    padding: "3px 8px"
  chip-cluster:
    textColor: "{colors.haze}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  tabbar:
    backgroundColor: "rgba(16, 10, 30, 0.82)"
    textColor: "{colors.mute}"
    typography: "{typography.label}"
    height: "56px"
---

# Design System: Relay

## Overview

**Creative North Star: "The Lit Stage, the Flat Programme"**

Relay is a theatre. The frame performs: a lettered RELAY marquee between two rows of chasing purple and green bulbs, a follow-spot cone hung from above, an opening curtain once per session and a closing curtain at the end of the feed. Inside the frame, each trade plan is one act on a flat velvet panel, and the data on that panel never moves, glows or decorates. The brand gradient belongs to the frame; the figures belong to the reader.

Density is one plan per screen on a 440px column, read top to bottom in a fixed order: creator, pair, entry range, status, window, rationale, evidence, actions in the thumb zone. The world is dark velvet with a purple cast, not black, and its theatre materials are flat: the curtain halves, valance, closing drapes and desktop wings are plain velvet gradients falling to black, meeting at a single hairline. No fabric folds, fringe or raster drapery.

**Key Characteristics:**
- Velvet near-black ground with a purple cast; three raised velvet steps for panels.
- Solana purple and green confined to the frame: marquee bulbs, spotlight, card edge, active tab rule, primary button, focus ring, links.
- Condensed display type for names and pairs; a neutral grotesk with tabular numerals for everything read.
- Status carried by ink plus icon plus shape plus words, never by color alone.
- Pill controls, softly rounded panels, hairline borders, drawn stroke icons.
- Motion is the frame's (curtain, bulbs, spot); data moves only to report a change (range marker).

## Colors

A velvet stage of purple-cast near-blacks, chalk and haze text, Solana brand light at the edges, and five quiet status inks.

### Primary
- **Solana Purple** (`sol-purple`): the frame's light. Spotlight cone, marquee sign glow, curtain-side warmth of the brand gradient, text selection. Never fills a data surface.
- **Solana Green** (`sol-green`): the frame's other light and the system's interactive accent: links, focus outline, text caret, the "watched" star and toggled-on button state, alternating marquee bulbs.
- **Brand Gradient** (`linear-gradient(100deg, #b57bff 0%, #8f7dff 40%, #3fe0b6 80%, #14f195 100%)`): the primary button fill and the 2px active-tab rule. Nothing else.
- **Brand Edge** (`linear-gradient(140deg, rgba(153,69,255,0.6), rgba(153,69,255,0.12) 45%, rgba(20,241,149,0.35))`): the 1px border of the act panel and the marquee's bottom rule; the only gradient that touches a data container, and only at its perimeter.

### Secondary
- **Lilac Lamp** (`sol-purple-light`): the lit purple bulb in the marquee.

### Tertiary (status inks)
- **In-Range Green** (`st-in`): "In plan range". Shares the Solana green hue deliberately; on the status panel it reads as a filled check icon, a band and words.
- **Passed Amber** (`st-above`): "Original entry passed"; also the icon and border tint of warning banners (stale data, service trouble).
- **Below Cyan** (`st-below`): "Below plan range".
- **Ended Lavender** (`st-ended`): "Plan expired" and "Closed by creator".
- **Unknown Lilac** (`st-unknown`): "Price may be outdated" and "Price unavailable"; always paired with a dashed border and dashed track.
- **Error Rose** (`danger`): reserved for errors; defined in tokens and not yet used on a shipped surface.

### Neutral
- **Velvet** (`velvet`): the stage ground, page background, valance.
- **Velvet 2** (`velvet-2`): the act panel, banners, watchlist rows, the light side of curtain and drape gradients.
- **Velvet 3** (`velvet-3`): the status panel inside the act, tally chips, disabled primary button.
- **Velvet 4** (`velvet-4`): ghost button hover fill, scrollbar thumb.
- **Chalk** (`chalk`): primary text and every figure; the range marker; the "new plans" pill fill.
- **Haze** (`haze`): secondary text: meta lines, range labels, window line, banner body.
- **Mute** (`mute`): tertiary text: inactive tabs, definition terms, disabled labels, absent-evidence lines.
- **Hairline / Hairline Strong** (`hairline`, `hairline-strong`): 1px dividers, chip and button outlines, curtain meeting edges.

### Named Rules
**The Frame-Only Brand Rule.** Solana purple, green and their gradients light the frame (marquee, spot, curtain, tab rule, primary button, card perimeter, focus). They never fill, tint or glow behind a figure, a status headline or a rationale.

**The Ink-Plus-Shape Rule.** A status ink never appears alone: it always arrives with its icon, its words, a hint line and a tinted 1px top rule on the status panel; price states add a dashed rule and dashed track.

## Typography

**Display Font:** Big Shoulders Display (with Arial Narrow, sans-serif)
**Body Font:** Schibsted Grotesk (with system-ui, sans-serif)
**Label/Mono Font:** ui-monospace / SF Mono only for `code` and `kbd`

**Character:** A tall, condensed theatre-bill face for RELAY, pairs, names and stage titles, set against a plain newsprint grotesk that does all the reading. Every number is tabular and lining.

### Hierarchy
- **Display** (800, 2.5rem, 0.95): stage titles: page titles, the finale "caught up" line, service-state headlines (2.25rem there).
- **Headline** (800, 2.125rem, 0.95): the trading pair on each act, the largest thing on the card. On viewports under 860px tall it is set at 2.25rem.
- **Marquee** (800, 1.625rem, 0.32em tracking): the RELAY sign only.
- **Title** (700, 1.25rem, 1.05): creator name in the act byline, truncated with an ellipsis.
- **Status** (Schibsted 700, 1.25rem, 1.2): the entry-status headline, in its ink.
- **Body** (400, 0.9375rem, 1.45): rationale and general reading text; page prose capped at 62ch. Lead (1rem) for the entry range.
- **Small / Footnote** (0.875rem / 0.8125rem): price line, hint, window line, evidence, banners, meta.
- **Label** (600, 0.75rem, 0.02em): tab labels, cluster chip, range labels, chain-clock chip.

### Named Rules
**The Two Voices Rule.** Display type names things (RELAY, pairs, creators, stage titles); the grotesk reports things. A number is never set in the display face except as part of a pair name.

**The Tabular Rule.** Prices, ranges, times and counts use tabular lining numerals so values line up and don't jitter when they update.

## Layout

A fixed three-row app shell: a 56px marquee (plus safe-area inset), a stage that fills the rest, and a 56px tab bar (plus safe-area inset). The feed is a vertical scroll-snap list, one act per full stage height, with mandatory snap and stop-always; no auto-advance. Acts carry 12px outer padding; the panel pads 16px vertical and 20px horizontal, with a 12px internal gap.

Spacing runs on a 4/8 grid (4, 8, 12, 16, 20, 24, 32, 48). On viewports under 860px tall the card tightens (panel padding 12/16px, gap 8px) so the whole act fits without internal scroll; under 760px the rationale clamps to one line instead of two. The action row is sticky to the panel's bottom edge only when the card must scroll, keeping Watch in the thumb zone.

At 900px and wider the shell becomes a three-column grid: a 440px centered column between two flat wings that fall from black to transparent, the marquee spanning full width, the tab bar boxed by side hairlines, and a keyboard hint (J/K, arrows, W) fixed bottom-right. Secondary pages (Search, My Plans, Account) are a single 600px column with 32/20/48px padding.

## Elevation & Depth

Flat by construction. Depth comes from velvet steps (velvet to velvet-4) and light, not shadow: the follow-spot cone and a soft purple radial wash at the top of the shell give the stage its volume, and the active act receives a faint lift (a radial purple tint across its top 140px plus a 1px inner top highlight) that fades in over 600ms. Data panels carry no shadow.

### Shadow Vocabulary
- **Marquee sign glow** (`text-shadow: 0 0 14px rgba(153,69,255,0.75), 0 0 2px rgba(243,238,255,0.6)`): the RELAY letters only; it is the lit sign.
- **Bulb glow** (`box-shadow: inset 0 0 0 1px rgba(0,0,0,0.35), 0 0 6px 1px <lamp glow>`): each lit marquee bulb.
- **Finale title glow** (`text-shadow: 0 0 22px rgba(153,69,255,0.55)`): the end-of-feed title, a frame moment.
- **Floating pill** (`box-shadow: 0 6px 18px rgba(0,0,0,0.45)`): the chalk "new plans" pill that floats over the feed; the one surface that hovers.
- **Marker knockout** (`box-shadow: 0 0 0 3px var(--velvet-3)`): separates the chalk range marker from the band; a cut, not a lift.

### Named Rules
**The Glow Belongs To Lamps Rule.** Glow is reserved for things that are lights in the theatre: the marquee sign, the bulbs, the spot and the finale title. Panels, buttons, figures and status headlines are never lit from within.

## Shapes

Soft, consistent rounding with pill controls. Panels use 20px (act), 14px (banners, watchlist rows) and 10px (marquee sign, focus shape on tabs); every button, chip, tally item and the range track and band are full pills (999px). The fictional badge and `kbd` keys use a tighter 6px. Borders are 1px hairlines; dashed borders are a semantic signal (unavailable price, fictional/preview content, disabled actions), not decoration. Theatre geometry is rectangular and flat: curtain halves, drapes and wings are straight-edged velvet panels meeting on one hairline. Icons are a single drawn stroke family on a 24 grid, 1.75 stroke, round caps and joins; the in-range status uses a solid disc with a knocked-out check, and the watched star fills.

## Components

### Buttons
Full-pill, 48px tall, plain and tactile; the gradient is earned only by the primary action.
- **Shape:** full pill (999px), 48px min height, 20px horizontal padding; small variant 40px tall, 16px padding, small type.
- **Primary:** brand gradient fill, velvet text, weight 600, no border. Hover raises brightness to 108%.
- **Ghost (default):** transparent with a strong hairline border, chalk text. Hover fills velvet-4 and brightens the border.
- **Toggled on (Watch):** green-tinted border and green text with a filled star.
- **Disabled:** mute text and a dashed border; the disabled primary drops its gradient for velvet-3. A disabled action always shows its reason in footnote type directly beneath.
- **Transitions:** background, border and color over 220ms on the expo-out curve.

### Chips
- **Cluster chip:** pill with strong hairline border, haze label type, pinned right in the marquee.
- **Chain clock / tally:** small pills with hairline border on velvet-3 or transparent; figures inside in chalk, tabular.
- **Fictional badge:** 6px-rounded, dashed chalk border, uppercase 0.6875rem 700 with 0.08em tracking. It is a mandatory truth label for invented content, not an ornamental tag.

### Cards / Containers
- **Act panel:** velvet-2 fill, 20px radius, 1px brand-edge gradient border, flat. Internally scrolls only when it must, with scrollbars hidden. Offline data desaturates the whole panel to 25%.
- **Status panel:** full-bleed band inside the act on velvet-3, with a 1px top rule tinted 55% of its status ink (dashed for price states). Holds icon + status headline, the range bar, "Now $X · updated Ns ago", and a chalk hint line.
- **Banner:** velvet-2, 14px radius, amber-tinted border and amber alert icon for warnings; dashed chalk border for the fictional preview notice.

### Inputs / Fields
No text inputs ship yet. The global focus treatment is a 2px Solana-green outline offset 2px; the green caret is set system-wide.

### Navigation
- **Marquee:** 56px, velvet gradient from #120a22, brand-edge bottom rule, centered RELAY sign between two rows of 6px bulbs alternating lilac and mint, chasing in three phases over 2.7s.
- **Tab bar:** four equal tabs (Feed, Search, My Plans, Account), stroke icon over a 0.75rem 600 label. Inactive mute, hover haze, current chalk with a 2px brand-gradient rule on the top edge spanning the middle 44%. Background is translucent velvet with a 14px backdrop blur over a top hairline.

### Range Bar (signature)
An 8px pill track (chalk at 8% alpha), the plan's entry band as a pill in its status ink at 34% fill with a 70% inner outline, and a 4×22px chalk marker knocked out of the band by a 3px velvet-3 ring. The marker slides to the price over 250ms; when the price is beyond the range it clamps to the edge with a small chalk arrowhead. Without a price the track turns dashed and the band and marker disappear. Range labels sit beneath in tabular label type.

### Curtain and Finale (signature)
The opening curtain is two flat velvet halves (black to velvet-2) meeting on a 1px hairline, with a 44px velvet valance. Once per session, the halves part and narrow over 1.05s on the curtain curve after a 0.12s hold, and the valance lifts away; the curtain never receives pointer events and is removed entirely when reduced motion or a prior viewing applies. At the end of the feed the finale card draws two matching drapes in from the wings over 700ms, framing a "caught up" title, a tally of statuses and the next actions.

## Do's and Don'ts

### Do:
- **Do** keep every data surface flat on velvet-2 / velvet-3; let the brand gradient touch only its 1px perimeter.
- **Do** pair each status ink with its icon, its exact words, a hint and a tinted top rule; use dashed rule and dashed track for price states.
- **Do** set the pair and creator name in Big Shoulders Display and every figure in Schibsted Grotesk with tabular lining numerals.
- **Do** use pill buttons at 48px (40px small) with the brand gradient reserved for the single primary action, and show a disabled action's reason beneath it.
- **Do** use dashed borders to mean "not real or not available": fictional content, missing price, unavailable action.
- **Do** build theatre pieces (curtain, drapes, wings, valance) as flat velvet gradients falling to black, meeting on a single hairline.
- **Do** switch off the curtain, bulb chase, spotlight easing and smooth scroll under reduced motion.

### Don't:
- **Don't** put a glow, gradient fill or spotlight over a price, range, status headline or rationale.
- **Don't** draw fabric: no fold stripes, bead fringe, gathered drapes or raster curtain imagery.
- **Don't** use red for anything but errors, or Solana green on a status other than "In plan range" and interactive affordances.
- **Don't** let the curtain block input or replay within a session.
- **Don't** introduce a second icon family; glyphs are the 24-grid, 1.75-stroke drawn set, with solid fill reserved for the in-range check disc and the watched star.
