# Evidence operations: the reviewer's runbook

For the person who reviews evidence requests and keeps public-source coverage fresh. Authority is [PRODUCT.md](../../PRODUCT.md); the server rules are in [server/README.md](../../server/README.md#evidence-requests-who-can-do-what). This page is how to do the job, not a new rule.

**The one rule: never fake an answer.** Nothing here certifies a claim as true or false. An answer is a link a reviewer opened and read, in the reviewer's own words, with the relationship stated honestly. When nothing is found, close the request as unresolved and say why.

## What a reader sees, and why "Ask" can look quiet

A reader asks a narrow question about an idea (10 to 280 characters, no links). It stays **private** until a reviewer approves it, so with no reviewer the Ask feature does nothing public. That is correct, not a fault. The reader sees only their own requests and their state (`GET /discovery/me/requests`).

```
pending_review ──approve-request──> open ──accept (a reference)──> answered
      │                               │
 reject-request                  close-request
      │                               │
   rejected                    closed_unresolved
```

A reference (a public `https` link or a transaction) can only be sent on a request that is `open`, and it is itself `pending_review` until accepted or rejected.

## Where to run it (read this first)

The root `.env` may point at a **remote** database (the dev server uses Neon on purpose). Every command below refuses a remote host unless it is named with `--confirm-db-host=<host>`. To practise against the local Docker database instead, override the URL for the command:

```bash
# from the repo root; docker compose -f compose.dev.yaml up -d must be running
L=postgres://relay:relay_local_only@127.0.0.1:5432/relay
DATABASE_URL=$L DATABASE_DIRECT_URL=$L bun run --cwd server review list
```

The first line it prints is the target (`database: relay on 127.0.0.1 (local)`). Check it before you approve anything. For the real database, add `--confirm-db-host=<that host>` deliberately, and only when you mean it.

## The routine

1. **List what is waiting.**
   ```bash
   bun run --cwd server review list
   ```
   Requests and references are written by strangers. They are printed as quoted JSON strings and are never fetched or executed.
2. **Approve or reject each request.** Is the question narrow, about this idea, and answerable from a public source?
   ```bash
   bun run --cwd server review approve-request <er_id> --reviewer "Your name"
   bun run --cwd server review reject-request  <er_id> --reviewer "Your name" --note "why"
   ```
   Approving publishes it as an "Evidence requested" event on the idea's timeline. A rejection is shown only to the requester, with your note.
3. **Review references on open requests.** Open the link yourself in a browser first: the server never does. Read it. Decide how it relates to the idea:
   - `creator_confirmed`: the author's own later item explicitly refers to the original.
   - `editorially_associated`: same author, same subject, no explicit reference.
   - `uncertain`: you cannot support the link.
   ```bash
   bun run --cwd server review accept <es_id> --reviewer "Your name" \
     --summary "what the reference shows, in your words" \
     --basis editorially_associated --note "how it relates to the idea"
   bun run --cwd server review reject <es_id> --reviewer "Your name" --note "why"
   ```
   Accepting publishes **your summary and the link**, never the submitter's explanation, as a "Response added" event. Two items that mention the same asset are not related.
4. **Close what cannot be answered.**
   ```bash
   bun run --cwd server review close-request <er_id> --reviewer "Your name" --note "what was looked for and not found"
   ```
   That is a legitimate end state ("closed unresolved"), shown with your reason and with no verdict on the claim.

Two reviewers acting at once is safe: one wins and one event is written (tested).

## Keeping coverage fresh

Coverage is hand-recorded, and the UI says when it was last captured. Check it weekly:

```bash
bun run --cwd server curate --check     # the file is valid; reads no database
bun run --cwd server curate --report    # coverage and freshness per profile, and warnings
```

On 2026-10-13 the report showed 3 profiles, 4 ideas, newest capture 2026-10-11, and one expected warning (Brandt's later item is `uncertain`, shown to readers as "link not established"). Adding or changing a record means editing `server/curation/curated.json` (history is append-only: add a correction event, never rewrite) and loading it with `curate`, against the database you name.

Automatic detection (titles, links and dates from each author's own feed) is separate and labelled "Detected automatically · not reviewed". Check it is alive:

```bash
bun run --cwd server feeds      # poll once now and print each feed's result
```

This writes (titles, links and dates only, after running migrations), so the same database-target rule applies. The server polls every 30 minutes unless `FEEDS_POLL=off`. A feed's last error shows in `GET /discovery/feed`. On 2026-10-13, against the local database, all three feeds answered (Hayes' Substack 20 items, Brandt's site 10, Cowen's YouTube channel 15).

## What not to do

- Do not approve a request or reference you have not read, or a link you have not opened.
- Do not write an answer yourself to make the page look busy. An empty timeline is honest.
- Do not wire in wallet PnL or any outside provider (`walletData: none`); do not link a wallet to a profile without independent support.
- Do not edit a recorded entry. Add a correction event.

## Checked

`server/test/evidence.test.ts` covers the whole path (ask, private until approved, approve, reference, accept as the reviewer's words, reject, close, two reviewers at once, and that no HTTP route can review anything). On 2026-10-13 `review list` and `curate --report` ran against the local database: 0 requests waiting, coverage as above. A live rehearsal with a real visitor request has not been done.
