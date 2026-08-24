-- AI outputs are stored only as workspace-scoped audit history.
-- Browser users can read their workspace history, while server-side code writes after validating the user session.

create table if not exists public.pulseboard_ai_insight_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pulseboard_workspaces(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  question text not null check (char_length(trim(question)) between 2 and 600),
  answer text not null check (char_length(trim(answer)) between 2 and 12000),
  model text not null check (char_length(trim(model)) between 2 and 160),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pulseboard_ai_insights_workspace_idx
  on public.pulseboard_ai_insight_runs(workspace_id, created_at desc);
create index if not exists pulseboard_ai_insights_requester_idx
  on public.pulseboard_ai_insight_runs(requested_by, created_at desc);

alter table public.pulseboard_ai_insight_runs enable row level security;

drop policy if exists "pulseboard_ai_insights_select_members" on public.pulseboard_ai_insight_runs;
create policy "pulseboard_ai_insights_select_members"
  on public.pulseboard_ai_insight_runs
  for select to authenticated
  using (public.pulseboard_is_workspace_member(workspace_id));

grant select on public.pulseboard_ai_insight_runs to authenticated;
