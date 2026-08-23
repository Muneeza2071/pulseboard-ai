-- PulseBoard AI is isolated from DevDesk by a strict pulseboard_* naming boundary.
-- All customer and business data remains scoped by workspace membership through RLS.

create extension if not exists pgcrypto;

create table if not exists public.pulseboard_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulseboard_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulseboard_workspace_members (
  workspace_id uuid not null references public.pulseboard_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.pulseboard_customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pulseboard_workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  segment text check (segment in ('startup', 'growth', 'scale', 'enterprise')),
  lifecycle_stage text not null default 'lead' check (lifecycle_stage in ('lead', 'onboarding', 'active', 'expansion', 'churned')),
  health_status text not null default 'watch' check (health_status in ('healthy', 'watch', 'at_risk')),
  health_score smallint not null default 50 check (health_score between 0 and 100),
  annual_value_cents integer not null default 0 check (annual_value_cents >= 0),
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulseboard_deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pulseboard_workspaces(id) on delete cascade,
  customer_id uuid references public.pulseboard_customers(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 160),
  stage text not null default 'qualified' check (stage in ('qualified', 'proposal', 'negotiation', 'won', 'lost')),
  value_cents integer not null default 0 check (value_cents >= 0),
  probability smallint not null default 0 check (probability between 0 and 100),
  expected_close_date date,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulseboard_metric_definitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pulseboard_workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  metric_key text not null check (metric_key ~ '^[a-z][a-z0-9_]{1,62}$'),
  unit text not null default 'number' check (unit in ('number', 'currency_cents', 'percent', 'ratio')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, metric_key)
);

create table if not exists public.pulseboard_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pulseboard_workspaces(id) on delete cascade,
  metric_id uuid not null references public.pulseboard_metric_definitions(id) on delete cascade,
  observed_at timestamptz not null,
  value_numeric numeric not null,
  source text not null default 'manual' check (source in ('manual', 'csv_import', 'connector', 'calculated')),
  created_at timestamptz not null default now(),
  unique (metric_id, observed_at)
);

create table if not exists public.pulseboard_activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pulseboard_workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (char_length(trim(event_type)) between 2 and 80),
  entity_type text not null check (char_length(trim(entity_type)) between 2 and 80),
  entity_id uuid,
  summary text not null check (char_length(trim(summary)) between 2 and 280),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.pulseboard_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pulseboard_workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(trim(action)) between 2 and 120),
  target_type text not null check (char_length(trim(target_type)) between 2 and 80),
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists pulseboard_members_user_idx on public.pulseboard_workspace_members(user_id, workspace_id);
create index if not exists pulseboard_workspaces_owner_idx on public.pulseboard_workspaces(owner_id);
create index if not exists pulseboard_customers_workspace_idx on public.pulseboard_customers(workspace_id, health_status, updated_at desc);
create index if not exists pulseboard_customers_owner_idx on public.pulseboard_customers(owner_id);
create index if not exists pulseboard_deals_workspace_idx on public.pulseboard_deals(workspace_id, stage, updated_at desc);
create index if not exists pulseboard_deals_customer_idx on public.pulseboard_deals(customer_id);
create index if not exists pulseboard_deals_owner_idx on public.pulseboard_deals(owner_id);
create index if not exists pulseboard_metrics_workspace_idx on public.pulseboard_metric_snapshots(workspace_id, observed_at desc);
create index if not exists pulseboard_activity_workspace_idx on public.pulseboard_activity_events(workspace_id, occurred_at desc);
create index if not exists pulseboard_activity_actor_idx on public.pulseboard_activity_events(actor_id);
create index if not exists pulseboard_audit_workspace_idx on public.pulseboard_audit_events(workspace_id, occurred_at desc);
create index if not exists pulseboard_audit_actor_idx on public.pulseboard_audit_events(actor_id);

create or replace function public.pulseboard_handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.pulseboard_profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists pulseboard_on_auth_user_created on auth.users;
create trigger pulseboard_on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.pulseboard_handle_new_auth_user();

create or replace function public.pulseboard_is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.pulseboard_workspace_members
    where workspace_id = target_workspace and user_id = auth.uid()
  );
$$;

create or replace function public.pulseboard_can_manage_workspace(target_workspace uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.pulseboard_workspace_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.pulseboard_handle_workspace_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.pulseboard_workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  insert into public.pulseboard_audit_events (workspace_id, actor_id, action, target_type, target_id, details)
  values (new.id, new.owner_id, 'workspace.created', 'workspace', new.id, jsonb_build_object('name', new.name));
  return new;
end;
$$;

drop trigger if exists pulseboard_on_workspace_created on public.pulseboard_workspaces;
create trigger pulseboard_on_workspace_created
  after insert on public.pulseboard_workspaces
  for each row execute procedure public.pulseboard_handle_workspace_created();

alter table public.pulseboard_profiles enable row level security;
alter table public.pulseboard_workspaces enable row level security;
alter table public.pulseboard_workspace_members enable row level security;
alter table public.pulseboard_customers enable row level security;
alter table public.pulseboard_deals enable row level security;
alter table public.pulseboard_metric_definitions enable row level security;
alter table public.pulseboard_metric_snapshots enable row level security;
alter table public.pulseboard_activity_events enable row level security;
alter table public.pulseboard_audit_events enable row level security;

drop policy if exists "pulseboard_profiles_select_own" on public.pulseboard_profiles;
create policy "pulseboard_profiles_select_own" on public.pulseboard_profiles for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "pulseboard_profiles_update_own" on public.pulseboard_profiles;
create policy "pulseboard_profiles_update_own" on public.pulseboard_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "pulseboard_workspaces_select_members" on public.pulseboard_workspaces;
create policy "pulseboard_workspaces_select_members" on public.pulseboard_workspaces for select to authenticated using (public.pulseboard_is_workspace_member(id));
drop policy if exists "pulseboard_workspaces_update_managers" on public.pulseboard_workspaces;
create policy "pulseboard_workspaces_update_managers" on public.pulseboard_workspaces for update to authenticated using (public.pulseboard_can_manage_workspace(id)) with check (public.pulseboard_can_manage_workspace(id));
drop policy if exists "pulseboard_workspaces_insert_owner" on public.pulseboard_workspaces;
create policy "pulseboard_workspaces_insert_owner" on public.pulseboard_workspaces for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "pulseboard_members_select_members" on public.pulseboard_workspace_members;
create policy "pulseboard_members_select_members" on public.pulseboard_workspace_members for select to authenticated using (public.pulseboard_is_workspace_member(workspace_id));
drop policy if exists "pulseboard_members_insert_managers" on public.pulseboard_workspace_members;
create policy "pulseboard_members_insert_managers" on public.pulseboard_workspace_members for insert to authenticated with check (public.pulseboard_can_manage_workspace(workspace_id));
drop policy if exists "pulseboard_members_update_managers" on public.pulseboard_workspace_members;
create policy "pulseboard_members_update_managers" on public.pulseboard_workspace_members for update to authenticated using (public.pulseboard_can_manage_workspace(workspace_id)) with check (public.pulseboard_can_manage_workspace(workspace_id));
drop policy if exists "pulseboard_members_delete_managers_or_self" on public.pulseboard_workspace_members;
create policy "pulseboard_members_delete_managers_or_self" on public.pulseboard_workspace_members for delete to authenticated using (user_id = (select auth.uid()) or public.pulseboard_can_manage_workspace(workspace_id));

create policy "pulseboard_customers_members_all" on public.pulseboard_customers for all to authenticated using (public.pulseboard_is_workspace_member(workspace_id)) with check (public.pulseboard_is_workspace_member(workspace_id));
create policy "pulseboard_deals_members_all" on public.pulseboard_deals for all to authenticated using (public.pulseboard_is_workspace_member(workspace_id)) with check (public.pulseboard_is_workspace_member(workspace_id));
create policy "pulseboard_metric_definitions_members_all" on public.pulseboard_metric_definitions for all to authenticated using (public.pulseboard_is_workspace_member(workspace_id)) with check (public.pulseboard_is_workspace_member(workspace_id));
create policy "pulseboard_metric_snapshots_members_all" on public.pulseboard_metric_snapshots for all to authenticated using (public.pulseboard_is_workspace_member(workspace_id)) with check (public.pulseboard_is_workspace_member(workspace_id));
create policy "pulseboard_activity_members_all" on public.pulseboard_activity_events for all to authenticated using (public.pulseboard_is_workspace_member(workspace_id)) with check (public.pulseboard_is_workspace_member(workspace_id));
create policy "pulseboard_audit_members_select" on public.pulseboard_audit_events for select to authenticated using (public.pulseboard_is_workspace_member(workspace_id));

grant select, insert, update, delete on public.pulseboard_profiles, public.pulseboard_workspaces, public.pulseboard_workspace_members, public.pulseboard_customers, public.pulseboard_deals, public.pulseboard_metric_definitions, public.pulseboard_metric_snapshots, public.pulseboard_activity_events, public.pulseboard_audit_events to authenticated;
revoke execute on function public.pulseboard_handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.pulseboard_handle_workspace_created() from public, anon, authenticated;
revoke execute on function public.pulseboard_is_workspace_member(uuid) from public, anon, authenticated;
revoke execute on function public.pulseboard_can_manage_workspace(uuid) from public, anon, authenticated;
