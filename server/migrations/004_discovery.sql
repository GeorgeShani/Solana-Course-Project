-- Discovery: traders, their sources, ideas and the timeline of each idea (package W2).
--
-- These tables describe PUBLIC STATEMENTS and what was later added to them. They are kept apart
-- from plans, versions and receipts on purpose: a public statement is not proof of a trade, and
-- only the Solana program can produce a receipt. Nothing here is read by the follow flow.
--
-- Rules the schema enforces itself:
--   * Nothing is invented. A real trader row must say who at Relay confirmed the source and when
--     (`owner_confirmed_*`); only rows flagged `is_demo` may omit it, and demo rows never appear
--     next to live ones (the API serves one or the other, never both).
--   * Source records, availability history, ideas and timeline events are insert-only. A source
--     that disappears is recorded as a new availability row and a tombstone event, never a delete.
--   * Every timeline event has a global, gap-tolerant `seq`. Readers keep a cursor on `seq`, never
--     on a timestamp, so tied times and late-arriving events cannot be missed.
--   * Each event carries a SHA-256 over its own fields and the previous event of the same idea, so
--     an edit to the middle of a timeline is detectable.
--
-- Unknown stays unknown: published_at, occurred_at and every attribution field may be NULL and
-- are shown as "unknown".

create table traders (
  id                  text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  display_name        text not null check (char_length(display_name) between 1 and 80),
  -- Markets the trader talks about, for example 'crypto', 'us-equities'. Not only Solana.
  markets             text[] not null check (cardinality(markets) between 1 and 8),
  -- Why Relay describes this profile as this person or account, in a sentence.
  attribution_basis   text not null check (char_length(attribution_basis) between 1 and 300),
  -- Never implies endorsement: 'public_source_only' means the trader did not agree to take part.
  participation       text not null check (participation in ('confirmed_participating', 'public_source_only')),
  -- What Relay cannot see or does not collect for this trader.
  coverage_limits     text not null check (char_length(coverage_limits) between 1 and 300),
  provenance          text not null default 'manual_coverage' check (provenance = 'manual_coverage'),
  curator             text not null check (char_length(curator) between 1 and 80),
  owner_confirmed_by  text check (owner_confirmed_by is null or char_length(owner_confirmed_by) between 1 and 80),
  owner_confirmed_at  date,
  is_demo             boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (is_demo or (owner_confirmed_by is not null and owner_confirmed_at is not null))
);

create table trader_links (
  id              bigserial primary key,
  trader_id       text not null references traders (id),
  kind            text not null check (kind in ('x', 'telegram', 'website', 'youtube', 'wallet', 'other')),
  -- An https URL, or a base58 wallet address for kind 'wallet'.
  value           text not null check (char_length(value) between 3 and 300),
  -- How we know this link belongs to the trader. A wallet signature proves control of the wallet,
  -- not who the person is, so a wallet link needs its own basis.
  identity_basis  text not null check (identity_basis in ('creator_confirmed', 'editorially_associated', 'uncertain')),
  basis_note      text check (basis_note is null or char_length(basis_note) <= 300),
  unique (trader_id, kind, value),
  check (identity_basis = 'creator_confirmed' or basis_note is not null)
);
create index trader_links_trader on trader_links (trader_id);

-- One captured public statement (a post, a thread, an article). Only a short permitted excerpt is
-- stored; the original is always one click away through `url`.
create table source_records (
  id                 text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  trader_id          text not null references traders (id),
  provider           text not null check (provider in ('x', 'telegram', 'website', 'youtube', 'other')),
  provider_id        text check (provider_id is null or char_length(provider_id) <= 120),
  url                text not null check (url ~ '^https://' and char_length(url) <= 500),
  record_type        text not null check (record_type in ('post', 'thread', 'article', 'video', 'other')),
  -- When the SOURCE says it was published, if we know. Not when we captured it.
  published_at       timestamptz,
  -- When Relay (a person) looked at it and captured it. Always known.
  retrieved_at       timestamptz not null,
  displayed_content  text check (displayed_content is null or char_length(displayed_content) <= 500),
  -- sha256 over the url, published_at, retrieved_at and displayed content as captured.
  content_hash       bytea not null check (octet_length(content_hash) = 32),
  provenance         text not null default 'manual_coverage' check (provenance = 'manual_coverage'),
  curator            text not null check (char_length(curator) between 1 and 80),
  is_demo            boolean not null default false,
  created_at         timestamptz not null default now()
);
create index source_records_trader on source_records (trader_id);

-- The history of whether a source can still be opened. The latest row is the current state.
create table source_availability (
  id                bigserial primary key,
  source_record_id  text not null references source_records (id),
  state             text not null check (state in ('available', 'unavailable', 'removed', 'unknown')),
  observed_at       timestamptz not null,
  note              text check (note is null or char_length(note) <= 300),
  unique (source_record_id, observed_at, state)
);
create index source_availability_latest on source_availability (source_record_id, observed_at desc, id desc);

create table ideas (
  id                  text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  trader_id           text not null references traders (id),
  source_record_id    text not null references source_records (id),
  -- A faithful one-line summary of what the original says. Not advice, not a rating.
  title               text not null check (char_length(title) between 1 and 140),
  -- Explicit identifiers only, for example 'SOL', 'BTC', 'AAPL'. Never guessed from text.
  assets              text[] not null check (cardinality(assets) between 1 and 8),
  market              text not null check (char_length(market) between 1 and 40),
  -- What the original itself says about entry, target or expiry, quoted. NULL means the idea does
  -- not state conditions; the app then says "Entry conditions not specified" and never computes a
  -- range status from it.
  stated_conditions   text check (stated_conditions is null or char_length(stated_conditions) <= 300),
  curator             text not null check (char_length(curator) between 1 and 80),
  is_demo             boolean not null default false,
  created_at          timestamptz not null default now()
);
create index ideas_trader on ideas (trader_id);

create table timeline_events (
  -- The global order. Readers use this as their cursor.
  seq                 bigint generated always as identity unique,
  id                  text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  idea_id             text not null references ideas (id),
  event_type          text not null check (event_type in (
                        'source_added', 'update_published', 'evidence_added', 'discrepancy_flagged',
                        'response_added', 'relay_plan_published', 'onchain_activity',
                        'source_unavailable', 'correction')),
  -- When it happened or was observed. NULL when unknown.
  occurred_at         timestamptz,
  -- When Relay recorded it. Always known.
  recorded_at         timestamptz not null default now(),
  source_record_id    text references source_records (id),
  -- What the event points at: a transaction signature, a Relay plan address, or a link.
  evidence_kind       text check (evidence_kind in ('transaction', 'relay_plan', 'url', 'source_record')),
  evidence_ref        text check (evidence_ref is null or char_length(evidence_ref) <= 500),
  -- How the event is tied to the idea. Two things that merely mention the same asset are NOT tied.
  relationship_basis  text not null check (relationship_basis in ('creator_confirmed', 'editorially_associated', 'uncertain', 'original')),
  basis_note          text check (basis_note is null or char_length(basis_note) <= 300),
  revision            integer not null default 1 check (revision >= 1),
  review_state        text not null default 'not_required' check (review_state in ('not_required', 'pending', 'reviewed', 'rejected')),
  summary             text not null check (char_length(summary) between 1 and 280),
  -- Re-running the curation loader with the same file must not duplicate anything.
  dedupe_key          text not null check (char_length(dedupe_key) between 1 and 200),
  -- Tamper evidence: sha256 over this event's fields and the previous event of the same idea.
  prev_hash           bytea check (prev_hash is null or octet_length(prev_hash) = 32),
  event_hash          bytea not null check (octet_length(event_hash) = 32),
  curator             text not null check (char_length(curator) between 1 and 80),
  is_demo             boolean not null default false,
  unique (idea_id, dedupe_key),
  check ((evidence_kind is null) = (evidence_ref is null)),
  check (relationship_basis in ('creator_confirmed', 'original') or basis_note is not null)
);
create index timeline_events_idea on timeline_events (idea_id, seq);

create trigger source_records_append_only before update or delete on source_records
  for each row execute function reject_row_change();
create trigger source_availability_append_only before update or delete on source_availability
  for each row execute function reject_row_change();
create trigger ideas_append_only before update or delete on ideas
  for each row execute function reject_row_change();
create trigger timeline_events_append_only before update or delete on timeline_events
  for each row execute function reject_row_change();
