-- Relay schema, part 1: plans, immutable versions, offchain text, creators, price observations.
--
-- Source of truth:
--   plans / plan_versions        -> copied from Solana accounts (the program is the authority)
--   plan_version_content         -> offchain text, accepted only if its hash equals the onchain content_hash
--   creators                     -> offchain profile data (the database is the authority)
--   price_observations           -> advisory market data (external source)
--
-- Amounts and prices are u64 and stored as numeric(20,0). Times are unix seconds (the chain clock).

create table creators (
  address      text primary key,
  handle       text not null,
  display_name text not null,
  bio          text,
  avatar_url   text,
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now()
);
create unique index creators_handle_lower on creators (lower(handle));

-- No foreign key to creators: a plan exists on chain whether or not its creator made a profile.
create table plans (
  plan_pda         text primary key,
  cluster          text not null check (cluster in ('localnet', 'devnet', 'mainnet')),
  creator_address  text not null,
  onchain_plan_id  numeric(20, 0) not null,
  base_mint        text not null,
  quote_mint       text not null,
  base_decimals    smallint not null,
  quote_decimals   smallint not null,
  latest_version   integer not null check (latest_version >= 1),
  status           text not null check (status in ('open', 'closed')),
  created_at_chain bigint not null,
  first_seen_at    timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index plans_creator on plans (creator_address);

create function reject_row_change() returns trigger language plpgsql as $$
begin
  raise exception '% rows are append-only', tg_table_name;
end;
$$;

-- Chain facts about each version. Insert-only: a version never changes.
create table plan_versions (
  plan_pda        text not null references plans (plan_pda),
  version         integer not null check (version > 0),
  version_pda     text not null unique,
  entry_low       numeric(20, 0) not null check (entry_low > 0),
  entry_high      numeric(20, 0) not null,
  expires_at      bigint not null,
  published_at    bigint not null,
  published_slot  numeric(20, 0) not null,
  content_hash    bytea not null check (octet_length(content_hash) = 32),
  prev_terms_hash bytea not null check (octet_length(prev_terms_hash) = 32),
  terms_hash      bytea not null check (octet_length(terms_hash) = 32),
  first_seen_at   timestamptz not null default now(),
  primary key (plan_pda, version),
  check (entry_high >= entry_low)
);
create trigger plan_versions_append_only before update or delete on plan_versions
  for each row execute function reject_row_change();

-- Offchain text for a version. Kept apart from the chain facts so a version can exist (and be shown
-- as "text unavailable") before, or without, its text. Also insert-only.
create table plan_version_content (
  plan_pda              text not null,
  version               integer not null,
  rationale             text not null,
  exit_thesis           text not null,
  exit_target           numeric(20, 0),
  invalidation          numeric(20, 0),
  ref_price_units       numeric(20, 0),
  ref_price_source      text,
  ref_price_observed_at timestamptz,
  created_at            timestamptz not null default now(),
  primary key (plan_pda, version),
  foreign key (plan_pda, version) references plan_versions (plan_pda, version)
);
create trigger plan_version_content_append_only before update or delete on plan_version_content
  for each row execute function reject_row_change();

create table price_observations (
  id          bigserial primary key,
  mint        text not null,
  price_units numeric(20, 0) not null,
  source      text not null,
  observed_at timestamptz not null default now()
);
create index price_observations_mint_time on price_observations (mint, observed_at desc);
