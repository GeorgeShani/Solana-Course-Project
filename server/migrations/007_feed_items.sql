-- Automatic feed items: new posts and videos detected in an author's own public RSS/Atom feed.
--
-- What these are: a title, an exact link and a date, as the author's own feed publishes them, plus
-- when Relay first saw them. Nothing more is stored (no article text), nothing here is an idea, an
-- update or evidence, and no relationship to an idea is claimed. A person may later record an item
-- by hand in the curation file; until then it is "detected automatically, not reviewed by Relay".

create table feed_sources (
  feed_url        text primary key check (feed_url ~ '^https://' and char_length(feed_url) <= 500),
  trader_id       text not null references traders (id),
  label           text not null check (char_length(label) between 1 and 120),
  last_checked_at timestamptz,
  last_ok_at      timestamptz,
  -- Plain text, never a URL or a response body.
  last_error      text check (last_error is null or char_length(last_error) <= 200)
);

create table feed_items (
  id            bigint generated always as identity primary key,
  trader_id     text not null references traders (id),
  feed_url      text not null references feed_sources (feed_url),
  title         text not null check (char_length(title) between 1 and 300),
  url           text not null unique check (url ~ '^https://' and char_length(url) <= 500),
  -- What the feed says. NULL when it gives none.
  published_at  timestamptz,
  first_seen_at timestamptz not null default now()
);

create index feed_items_newest on feed_items (published_at desc nulls last, first_seen_at desc);
