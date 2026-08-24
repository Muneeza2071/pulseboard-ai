-- Manual integration foundation. Credential ciphertext is stored separately and is never readable by browser roles.

create table if not exists public.pulseboard_integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pulseboard_workspaces(id) on delete cascade,
  provider text not null check (provider in ('github', 'hubspot')),
  status text not null default 'pending' check (status in ('pending', 'connected', 'error', 'disconnected')),
  account_label text,
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider)
);

create table if not exists public.pulseboard_integration_secrets (
  integration_id uuid primary key references public.pulseboard_integrations(id) on delete cascade,
  credential_ciphertext text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.pulseboard_integration_repositories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pulseboard_workspaces(id) on delete cascade,
  integration_id uuid not null references public.pulseboard_integrations(id) on delete cascade,
  provider_repository_id text not null,
  full_name text not null,
  default_branch text,
  selected boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  unique (integration_id, provider_repository_id)
);

create table if not exists public.pulseboard_sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pulseboard_workspaces(id) on delete cascade,
  integration_id uuid not null references public.pulseboard_integrations(id) on delete cascade,
  provider text not null check (provider in ('github', 'hubspot')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  requested_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_seen integer not null default 0 check (records_seen >= 0),
  records_written integer not null default 0 check (records_written >= 0),
  details jsonb not null default '{}'::jsonb,
  error_message text
);

alter table public.pulseboard_contacts add column if not exists external_source text;
alter table public.pulseboard_contacts add column if not exists external_id text;
create unique index if not exists pulseboard_contacts_external_identity_idx
  on public.pulseboard_contacts(workspace_id, external_source, external_id);

create index if not exists pulseboard_integrations_workspace_idx on public.pulseboard_integrations(workspace_id, provider);
create index if not exists pulseboard_repositories_workspace_idx on public.pulseboard_integration_repositories(workspace_id, integration_id);
create index if not exists pulseboard_sync_runs_workspace_idx on public.pulseboard_sync_runs(workspace_id, started_at desc);

drop trigger if exists pulseboard_integrations_touch_updated_at on public.pulseboard_integrations;
create trigger pulseboard_integrations_touch_updated_at
  before update on public.pulseboard_integrations
  for each row execute procedure public.pulseboard_touch_updated_at();

alter table public.pulseboard_integrations enable row level security;
alter table public.pulseboard_integration_secrets enable row level security;
alter table public.pulseboard_integration_repositories enable row level security;
alter table public.pulseboard_sync_runs enable row level security;

drop policy if exists "pulseboard_integration_secrets_server_only" on public.pulseboard_integration_secrets;
create policy "pulseboard_integration_secrets_server_only"
  on public.pulseboard_integration_secrets
  for select to authenticated
  using (false);

drop policy if exists "pulseboard_integrations_select_members" on public.pulseboard_integrations;
create policy "pulseboard_integrations_select_members"
  on public.pulseboard_integrations for select to authenticated
  using (public.pulseboard_is_workspace_member(workspace_id));

drop policy if exists "pulseboard_repositories_select_members" on public.pulseboard_integration_repositories;
create policy "pulseboard_repositories_select_members"
  on public.pulseboard_integration_repositories for select to authenticated
  using (public.pulseboard_is_workspace_member(workspace_id));

drop policy if exists "pulseboard_sync_runs_select_members" on public.pulseboard_sync_runs;
create policy "pulseboard_sync_runs_select_members"
  on public.pulseboard_sync_runs for select to authenticated
  using (public.pulseboard_is_workspace_member(workspace_id));

grant select on public.pulseboard_integrations, public.pulseboard_integration_repositories, public.pulseboard_sync_runs to authenticated;
revoke all on public.pulseboard_integration_secrets from anon, authenticated;
