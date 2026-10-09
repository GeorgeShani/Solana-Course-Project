-- Follow executions: one row per Relay follow transaction the server has verified.
--
-- Source of truth: the transaction and its FollowReceipt account on chain. Nothing in here is
-- taken from a client request; the verifier re-reads the chain. A failed transaction stays
-- `failed` (it is never turned into a successful-looking record), and a `recorded` row is never
-- downgraded.

create table executions (
  id            bigserial primary key,
  cluster       text not null check (cluster in ('localnet', 'devnet', 'mainnet')),
  tx_signature  text not null unique,
  follower      text not null,
  plan_pda      text not null,
  version       integer not null,
  receipt_pda   text unique,
  status        text not null check (status in ('recorded', 'failed')),
  error_code    integer,
  error_name    text,
  quote_spent   numeric(20, 0),
  base_received numeric(20, 0),
  effective_price numeric(20, 0),
  slot          numeric(20, 0),
  block_time    bigint,
  fee_lamports  bigint,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check ((status = 'recorded') = (receipt_pda is not null and quote_spent is not null and base_received is not null))
);
create index executions_follower on executions (follower, created_at desc);
create index executions_plan on executions (plan_pda, version);
