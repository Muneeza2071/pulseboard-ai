-- Replace partial indexes from the initial external identity rollout so PostgREST upserts can target them directly.

drop index if exists public.pulseboard_contacts_external_identity_idx;
drop index if exists public.pulseboard_customers_external_identity_idx;
drop index if exists public.pulseboard_deals_external_identity_idx;

create unique index pulseboard_contacts_external_identity_idx
  on public.pulseboard_contacts(workspace_id, external_source, external_id);
create unique index pulseboard_customers_external_identity_idx
  on public.pulseboard_customers(workspace_id, external_source, external_id);
create unique index pulseboard_deals_external_identity_idx
  on public.pulseboard_deals(workspace_id, external_source, external_id);
