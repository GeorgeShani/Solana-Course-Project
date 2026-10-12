# Roadmap

The active roadmap. Product authority is [PRODUCT.md](../PRODUCT.md); history is in [archive/](archive). Source: the owner's final restructure plan of 2026-10-11 (Phases 0-8), authorized 2026-10-12. One commit per milestone, on branch `feat/final-restructure`.

Status vocabulary: `DONE`, `IN PROGRESS`, `NEXT`.

## M0. Baseline and safety: DONE

Recorded 2026-10-12 on `main` at `b3d9534` (clean tree, branch `feat/final-restructure` cut from it).

| Check                   | Result                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `server curate --check` | valid: 3 traders, 4 ideas                                                                                    |
| domain tests / tsc      | 90 pass / clean                                                                                              |
| app tests               | 67 pass                                                                                                      |
| server tests            | 201 pass, 1 timing-sensitive failure (`hardening: chain reader timeouts`, 5 s test timeout under load)       |
| `bun run lint`          | failed: one type assertion in `app/src/lib/google-auth.ts` (introduced by the Google-auth commit)            |
| app `tsc -b`            | failed: `/account` search params typing (`Marquee`, `WalletButton`, `ActionRow`, `account.tsx`), same commit |

Fixed in M1 so every later milestone starts green: the two Google-auth regressions (`isRecord` guard; `/account` search typed as optional) and the server test, which failed only because awaiting `stop()` on a never-answering test server outlasts the test on Windows (the stop is no longer awaited). Open owner question: the Google-auth commit gates "Review trade" behind a Google sign-in, which PRODUCT.md does not provide for (a wallet is the only gate for a supported action).

## M1. Canonical docs and green baseline: DONE

PRODUCT.md, README.md, ROADMAP.md, AGENTS.md rewritten; historical plans archived; trader-data research rescoped; subsystem READMEs corrected; lint and type regressions fixed.

## M2. Welcome and application shell: DONE

Versioned local welcome preference (`relay:welcome:v2`; the older `relay:entered` still counts), replay from Account ("Show welcome") and the desktop header ("Meet Cue") over any page without changing the URL, `?welcome=true` kept only as a trigger that is replaced by the clean path, Escape skips, focus lands on the action and then on the page, deep links never get the overlay. The scene now lives in the root shell, not in the feed route. Tested by running the real boot script against fake pages (`app/test/welcome.test.ts`); checked in the browser at desktop and 375 wide. Navigation simplification moves to M3, when `/` becomes Discover.

## M3. Public discovery golden journey: IN PROGRESS

Public ideas are the default Discover content. Cards, profiles (unclaimed and manual-coverage disclosures), idea detail (Original → Later item → Evidence/unknowns), explicit relationship labels, safe external links. No `preview=fictional` anywhere in the real journey. Fictional plan states moved behind a development-only route.

## M4. Watch and return loop: NEXT

One versioned storage service, `/updates` over stored cursors, mark seen only on view, reopen the exact changed event, browser-only storage disclosure and private-mode failure behavior.

## M5. Native plans separation: NEXT

Native feed at `/plans`, `/plans/:planPda` (legacy `/records/*` redirects), "Published through Relay" labels, `GET /plans/feed` with `/feed` as a compatibility alias. Program and domain invariants untouched.

## M6. Frontend and backend maintainability: NEXT

Feature folders moved one at a time behind tests; duplicate trader/profile/plan-creator concepts removed; design tokens aligned with DESIGN.md; backend grouped into `modules/discovery`, `modules/plans`, `shared`; curation report and freshness metadata; readiness checks.

## M7. Demo, rehearsal and release gate: NEXT

`/demo` stays fictional and isolated; the technical demo uses only real curated records (and real devnet plans if shown); desktop, mobile, keyboard, reduced motion, empty and backend-down states verified; limitations match narration and docs.

## Deferred

Automatic X/Telegram/newsletter/exchange ingestion · creator claiming and identity verification · notifications · premium history and comparison · leaderboards, inferred PnL, universal wallet attribution · outside-Relay wallet PnL providers (see [research](research/TRADER_DATA_SOURCES_2026-10.md)) · more chains · copy trading · a large curation admin UI.
