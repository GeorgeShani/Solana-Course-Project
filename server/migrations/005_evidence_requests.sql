-- Evidence requests (package W5): a reader asks a narrow question about an idea, anyone may submit
-- a supporting reference, and a reviewer at Relay decides what becomes part of the public timeline.
--
-- What this is NOT: a truth judge. Nothing here certifies that a claim is true or false. A reviewer
-- adds a plain, reviewer-written event ("Response added") that points at the reference, and the
-- timeline says who reviewed it and how the reference relates to the idea.
--
-- Safety rules the schema and the service share:
--   * A visitor is an anonymous, server-issued browser session (a random token, stored only as its
--     SHA-256). It does NOT identify a person and does not stop one person from opening many.
--   * Requests are private until a reviewer approves them. Submissions are private until a reviewer
--     accepts one, and then only the reviewer's own summary and the validated link are public.
--   * There is no public route that reviews anything. Review is an internal command that needs
--     database access, so no caller can approve their own submission.
--   * Submitted links are validated and stored, never fetched.

-- The new event type for an approved request.
alter table timeline_events drop constraint timeline_events_event_type_check;
alter table timeline_events add constraint timeline_events_event_type_check check (event_type in (
  'source_added', 'update_published', 'evidence_added', 'discrepancy_flagged',
  'response_added', 'relay_plan_published', 'onchain_activity',
  'source_unavailable', 'correction', 'evidence_requested'));

create table visitor_sessions (
  token_hash   bytea primary key check (octet_length(token_hash) = 32),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null
);

create table evidence_requests (
  id                 text primary key check (id ~ '^er_[a-z0-9]{16}$'),
  idea_id            text not null references ideas (id),
  -- The timeline event the question is about, if it is about one.
  event_id           text references timeline_events (id),
  question           text not null check (char_length(question) between 10 and 280),
  -- sha256 of the question with whitespace and case folded, to catch the same question twice.
  question_key       bytea not null check (octet_length(question_key) = 32),
  session_hash       bytea not null references visitor_sessions (token_hash),
  status             text not null default 'pending_review'
                       check (status in ('pending_review', 'open', 'answered', 'closed_unresolved', 'rejected')),
  review_note        text check (review_note is null or char_length(review_note) <= 300),
  reviewed_by        text check (reviewed_by is null or char_length(reviewed_by) between 1 and 80),
  reviewed_at        timestamptz,
  -- The public timeline event created when a reviewer approves the request.
  published_event_id text references timeline_events (id),
  created_at         timestamptz not null default now(),
  unique (idea_id, session_hash, question_key),
  check (status = 'pending_review' or (reviewed_by is not null and reviewed_at is not null))
);
create index evidence_requests_idea on evidence_requests (idea_id, created_at);
create index evidence_requests_session on evidence_requests (session_hash, created_at);

create table evidence_submissions (
  id                text primary key check (id ~ '^es_[a-z0-9]{16}$'),
  request_id        text not null references evidence_requests (id),
  kind              text not null check (kind in ('url', 'transaction')),
  ref               text not null check (char_length(ref) between 3 and 500),
  -- The submitter's own words. Shown only to reviewers, never published.
  explanation       text not null check (char_length(explanation) between 10 and 500),
  session_hash      bytea not null references visitor_sessions (token_hash),
  status            text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  review_note       text check (review_note is null or char_length(review_note) <= 300),
  reviewed_by       text check (reviewed_by is null or char_length(reviewed_by) between 1 and 80),
  reviewed_at       timestamptz,
  -- The public timeline event created when a reviewer accepts the submission.
  response_event_id text references timeline_events (id),
  created_at        timestamptz not null default now(),
  unique (request_id, session_hash, ref),
  check (status = 'pending' or (reviewed_by is not null and reviewed_at is not null))
);
create index evidence_submissions_request on evidence_submissions (request_id, created_at);
create index evidence_submissions_session on evidence_submissions (session_hash, created_at);
