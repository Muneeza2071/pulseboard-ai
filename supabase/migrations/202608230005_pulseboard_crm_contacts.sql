-- PulseBoard CRM expansion: contacts remain isolated by workspace RLS.
-- The customer reference trigger prevents a workspace record from pointing at a customer in another workspace.

create table if not exists public.pulseboard_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pulseboard_workspaces(id) on delete cascade,
  customer_id uuid references public.pulseboard_customers(id) on delete set null,
  full_name text not null check (char_length(trim(full_name)) between 1 and 160),
  email text check (email is null or char_length(trim(email)) between 3 and 320),
  job_title text check (job_title is null or char_length(trim(job_title)) <= 160),
  is_primary boolean not null default false,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index if not exists pulseboard_contacts_workspace_idx
  on public.pulseboard_contacts(workspace_id, updated_at desc);
create index if not exists pulseboard_contacts_customer_idx
  on public.pulseboard_contacts(customer_id);
create index if not exists pulseboard_contacts_owner_idx
  on public.pulseboard_contacts(owner_id);

create or replace function public.pulseboard_validate_customer_workspace()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.customer_id is not null and not exists (
    select 1
    from public.pulseboard_customers
    where id = new.customer_id and workspace_id = new.workspace_id
  ) then
    raise exception 'PulseBoard customer must belong to the same workspace';
  end if;
  return new;
end;
$$;

drop trigger if exists pulseboard_deals_customer_workspace_guard on public.pulseboard_deals;
create trigger pulseboard_deals_customer_workspace_guard
  before insert or update of workspace_id, customer_id on public.pulseboard_deals
  for each row execute procedure public.pulseboard_validate_customer_workspace();

drop trigger if exists pulseboard_contacts_customer_workspace_guard on public.pulseboard_contacts;
create trigger pulseboard_contacts_customer_workspace_guard
  before insert or update of workspace_id, customer_id on public.pulseboard_contacts
  for each row execute procedure public.pulseboard_validate_customer_workspace();

create or replace function public.pulseboard_touch_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pulseboard_customers_touch_updated_at on public.pulseboard_customers;
create trigger pulseboard_customers_touch_updated_at
  before update on public.pulseboard_customers
  for each row execute procedure public.pulseboard_touch_updated_at();

drop trigger if exists pulseboard_deals_touch_updated_at on public.pulseboard_deals;
create trigger pulseboard_deals_touch_updated_at
  before update on public.pulseboard_deals
  for each row execute procedure public.pulseboard_touch_updated_at();

drop trigger if exists pulseboard_contacts_touch_updated_at on public.pulseboard_contacts;
create trigger pulseboard_contacts_touch_updated_at
  before update on public.pulseboard_contacts
  for each row execute procedure public.pulseboard_touch_updated_at();

alter table public.pulseboard_contacts enable row level security;

drop policy if exists "pulseboard_contacts_members_all" on public.pulseboard_contacts;
create policy "pulseboard_contacts_members_all"
  on public.pulseboard_contacts
  for all to authenticated
  using (public.pulseboard_is_workspace_member(workspace_id))
  with check (public.pulseboard_is_workspace_member(workspace_id));

grant select, insert, update, delete on public.pulseboard_contacts to authenticated;
revoke execute on function public.pulseboard_validate_customer_workspace() from public, anon, authenticated;
revoke execute on function public.pulseboard_touch_updated_at() from public, anon, authenticated;
