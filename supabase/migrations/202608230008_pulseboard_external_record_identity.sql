-- External source identifiers support idempotent user-triggered manual syncs.

alter table public.pulseboard_customers add column if not exists external_source text;
alter table public.pulseboard_customers add column if not exists external_id text;
alter table public.pulseboard_deals add column if not exists external_source text;
alter table public.pulseboard_deals add column if not exists external_id text;

create unique index if not exists pulseboard_customers_external_identity_idx
  on public.pulseboard_customers(workspace_id, external_source, external_id);
create unique index if not exists pulseboard_deals_external_identity_idx
  on public.pulseboard_deals(workspace_id, external_source, external_id);
