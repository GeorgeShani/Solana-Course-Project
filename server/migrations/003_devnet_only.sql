-- Relay runs on devnet (and a local test network for automated tests). The first migrations still
-- allowed a "mainnet" cluster name from an earlier direction; nothing writes it any more, and the
-- database should not be able to store it either.
--
-- NOT VALID: new and changed rows must satisfy the rule, but rows written before it are not
-- re-checked, so a development database that happens to hold an old value still migrates.

alter table plans drop constraint plans_cluster_check;
alter table plans add constraint plans_cluster_check
  check (cluster in ('localnet', 'devnet')) not valid;

alter table executions drop constraint executions_cluster_check;
alter table executions add constraint executions_cluster_check
  check (cluster in ('localnet', 'devnet')) not valid;
