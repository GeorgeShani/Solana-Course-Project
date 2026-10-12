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

## M3. Public discovery golden journey: DONE

`/` is Discover: three public-source profiles ("Public-source profile · Not claimed by the author"), a profile filter, and idea cards with trader, assets, paraphrase, source kind and host, publication time, the newest later item named as the timeline names it, Watch and Open. Idea pages end with "What Relay can and cannot establish" (`evidenceSummary`); Brandt's later item reads "Later item · link not established", Hayes's "Update to this idea". `GET /discovery/ideas` gained `latestUpdate` for the card line. The native feed moved to `/plans` (see M5); the fictional fixtures moved to development-only `/dev/plan-states` and are not in the production bundle; `/?preview=fictional` now only redirects there in development. `server/test/curated-data.test.ts` pins the dataset's promises (unclaimed, no wallets, https sources, relationship bases). Old routes redirect. Navigation is Discover, Updates, Watchlist, Plans (+ Account on phones).

## M4. Watch and return loop: DONE

One versioned browser store (`lib/storage/browser-store.ts`) now backs the saved ideas/profiles (`relay:discovery-watch:v1`), saved plans and watched plan creators, with the same keys and formats as before (no migration). `/updates` lists what changed since the stored cursor, and each entry links to the exact timeline entry (`/ideas/:id#event-:id`, which scrolls to it and focuses it); a cursor moves only when the reader opens the idea or taps "Mark as read", never because the list was shown. `/watchlist` is now Ideas, Profiles, Plans (saved native plans and plan creators) and Receipts; old `?tab=` values map or redirect. A "Stored in this browser only" notice appears on both pages and turns into a plain warning when the browser refuses to save. Tests: 13 for the store and watch cursors (`app/test/storage.test.ts`). Rehearsed twice in the browser against the local database (Hayes: author-linked update; Brandt: uncertain later item): watch, reload, Updates, open the exact entry, cursor moves, "You're caught up". The real data has no newer entry than what a new watch starts at, so the rehearsal sets the stored cursor back by hand; a live change needs a new curated entry.

## M5. Native plans separation: DONE

Routes: `/plans`, `/plans/:planPda`, `/plans/creators[/:address]`; `/records/*`, `/traders*` and `/?plan=` redirect. API: `GET /plans/feed` is canonical and `GET /feed` stays as a marked alias (`Deprecation: true`, `Link: </plans/feed>; rel="successor-version"`), registered so `feed` is never read as a plan address; the app now calls `/plans/feed`. Each real plan card says "Published through Relay" and "Solana devnet: test tokens"; "Connect wallet" appears in the header only on Plans, Account and the Watchlist (never on Discover, ideas, profiles or Updates). `app/test/separation.test.ts` reads the source and fails if a discovery screen imports a trade, follow, wallet or fixture module, if a plan screen imports discovery data, or if anything but `/dev/plan-states` imports the fixtures. No change to `program/` or `domain/` (their tests are unchanged).

## M6. Frontend and backend maintainability: DONE

**Frontend:** `app/src/features/{discovery,onboarding,plans,account}` (moved with an automated import rewrite, `tsc`, lint and 142 tests green); `lib/api/http.ts` holds the shared error and JSON-checking layer, `features/plans/api.ts` the plan contract; one `creatorLabel` replaces `traderName`/`creatorName` duplication, and wallet-signed "traders" are consistently "plan creators" (storage keys unchanged, so no one loses saved items); 190 lines of dead CSS and an unused helper removed. Not done: aligning every CSS value with DESIGN.md tokens and the contrast lint (see M7 follow-ups).

**Backend:** `server/src/modules/{discovery,plans,auth}` and `shared/`; endpoints unchanged. New: `curate --report` (coverage, freshness, warnings), `/health/ready` lists configured providers without calling them, and a database-target guard (`shared/db-target.ts`): migrate, curate, review and seed print the target host and refuse a remote one unless named (`--confirm-db-host`); the dev server only prints its target and starts (owner decision, it uses Neon on purpose). Added after a load reached a remote database by way of the root `.env`. Documented safe load, migration and rollback boundaries in `server/README.md`. No wallet-data adapter was added.

## M7. Demo, rehearsal and release gate: DONE (with limits below)

[docs/runbooks/DEMO.md](runbooks/DEMO.md) is the script. Verified 2026-10-12 on this machine:

| Check                                                                | Result                                                                                                                                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Production build, served                                             | `/` 200, `/plans` 200, idea page 200, `/dev/plan-states` **404**, `/records/:pda` and `/traders` redirect; fixtures absent from the bundle                                                 |
| Golden journey in the browser (local database, real curated records) | Welcome, Discover, Hayes (author-linked), Brandt (link not established), source links open with `noopener noreferrer nofollow`, Watch, reload, Updates, exact entry, caught up: done twice |
| Mobile (375 wide)                                                    | Welcome fits with both actions; Discover and the backend-down state read correctly; no wallet prompt on Discover                                                                           |
| Backend down                                                         | "Can't reach Relay's service", never stale or invented data                                                                                                                                |
| Contrast (all token pairs on the dark surfaces)                      | Every text, accent and status ink is at least 6.0:1 on `--velvet`, `--velvet-2`, `--velvet-3` (AA needs 4.5); computed from `tokens.css`                                                   |
| Automated                                                            | domain 90, server 215, app 142 tests; lint and `tsc` clean                                                                                                                                 |

Not verified, and stated so: the program was not rebuilt (`program:build`/`program:test` need WSL and were not run; `program/` is unchanged); no devnet plan or receipt was exercised, so Part 2 of the demo has not been rehearsed; no screen reader pass and no full keyboard audit beyond focus handling in the welcome and exact-entry links; reduced motion was reasoned from CSS and the boot script test, not observed; the `design-md` lint and the `impeccable`/`web-design-guidelines` skills were not installed (the plan makes that optional). The Google sign-in added before this restructure still gates "Review trade"; that is an open owner decision.

## M8. Discover as a stream, automatic feed, browser suite: DONE

`/` is a full-screen, one-idea-per-screen snap feed (swipe, wheel, J/K): an intro, the 4 hand-recorded ideas, then the newest items detected automatically in the authors' own public feeds (Hayes' Substack, Brandt's site, Cowen's YouTube channel), each marked "Detected automatically · not reviewed" with only title, link and date stored (`feed_items`, migration 007; `GET /discovery/feed`; polled every 30 minutes by the server, or `bun run --cwd server feeds`). Items already recorded by hand are not repeated. Playwright suite in `app/e2e` (journey, phone, accessibility with axe, keyboard, reduced motion, states): `bun run --cwd app e2e` against the running stack. A wallet-activity feed still needs a Solana Tracker key (not provided).

## M9. Screen-audit follow-up: IN PROGRESS

Plan from [AGENT_HANDOFF_SCREEN_AUDIT.md](AGENT_HANDOFF_SCREEN_AUDIT.md) and the 2026-10-12 captures, worked on `main` at the owner's request. Steps: H1 baseline, H2 plan watch and follow gate, H3 honest plans states, H4 copy and layout, H5 plans on devnet (owner deploys), H6 evidence operations, H7 hosting, H8 wrap-up.

**H1 baseline: DONE.** After merging the hermes-fix Discover polish, two checks failed on `main` and are fixed: lint (three type assertions in `app/scripts/capture-screens.ts`, now narrowed at runtime) and app `tsc -b` (the `--s` custom property in `Audience.tsx`, now a typed style object). The capture script also seeds its watched idea with the label a real Watch stores (the audit's "Hayes idea" was the script's own placeholder) and writes to `audit-<today>` so it never overwrites an earlier audit. Green: lint, domain 90, server 215, app 151 (`bun run test`; a bare `bun test` also picks up the Playwright specs and fails), app `tsc -b` and build. In the browser at 1280×800 and 375×812, Discover and the Interval have no horizontal overflow or scroll offset and all four Interval scenes render once the animation settles; the shifted frames in the audit's `03`/`04` do not reproduce after the merged CSS. Not run: `e2e`, `program:test`.

**H2 plan watch and follow gate: DONE.** Resolves the open owner question from M0/M7: the owner keeps Google sign-in as the gate for following, now written down as PRODUCT.md decision 10. (A first pass removed the gate entirely, `eb95fa0`; the owner chose this instead.) Before, the plan feed's Watch, View plan and Review trade all redirected visitors without a sign-in to `/account` without saying why. Now Watch and View plan act directly; Review trade reads "Sign in to review trade" until the visitor is signed in; the follow panel itself asks for the sign-in ("Sign in with Google to follow") before the wallet, so the gate also holds when `/plans/:pda#follow` is opened directly. Account's "Follow a plan" needs "Google sign-in" and "Wallet", and its sign-in copy says so. `app/test/separation.test.ts` pins which files may read the sign-in state and that Watch and View plan never wait on it. The gate is in the app only: the server's quote endpoint does not check the session, and the program is permissionless.

**H3 honest plans states: DONE.** A failed chain read used to be logged only, so an empty database behind a broken RPC looked exactly like "no plans". The plan service now keeps the state of its last read (`ok`, `failing`, `not_yet`) and when the chain was last read successfully; `GET /plans/feed` returns it as `sync` and `GET /health/ready` as `planSync` (informational; readiness still turns on the database and RPC checks). After a failed read the next request retries at once instead of waiting out the 5-second throttle, so a recovery shows immediately. The app: an empty feed while the chain can't be read says "Relay can't read Solana right now … None are shown instead of guessing" with the last good read, never "No open plans"; a non-empty feed shows the existing warning with the last good read; a server that does not report `sync` is treated as unknown. Tests: 3 server (empty vs failing, last good time kept while failing, recovery), 1 app parser. On devnet today the read succeeds and returns no plans, so the empty state is the honest one. The failing state was not looked at in the browser (it needs a broken RPC).

**H4 copy and layout: DONE.** About (owner wording): the third "Feed member" step said "Live" although coverage is recorded by hand; it now reads "Recorded" with the same green ring as "Recorded" in the legend below it, and the "Claim your profile · soon" pill is gone (claiming is deferred, so nothing promises it). The stage floor no longer draws a band under the plans message states (loading, unavailable, empty), as it already did not on reading pages. Checked and left as is: the demo's "Fictional demo · simulated prices · no real trades" banner is a deliberate tab hanging from the header and is fully readable, not clipped. Not changed: page-top spacing and container widths differ a little between Updates, Watchlist, Account and the profile/idea pages; no DESIGN.md token says which is right, so this waits for an owner call. Noticed: `html[data-house="on"] .stage-floor` is set in both `theatre.css` (26% with a background) and `audience.css` (24%), a leftover of the hermes-fix merge; audience.css loads later and wins on height.

## Deferred

Automatic X/Telegram/newsletter/exchange ingestion · creator claiming and identity verification · notifications · premium history and comparison · leaderboards, inferred PnL, universal wallet attribution · outside-Relay wallet PnL providers (see [research](research/TRADER_DATA_SOURCES_2026-10.md)) · more chains · copy trading · a large curation admin UI.
