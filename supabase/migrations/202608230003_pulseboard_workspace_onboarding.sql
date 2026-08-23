-- Replace the externally callable workspace RPC with a trigger-backed RLS insert.
-- The only privileged functions remaining are internal trigger/RLS helpers with no API execute grant.

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

drop function if exists public.pulseboard_create_workspace(text);

drop policy if exists "pulseboard_workspaces_insert_owner" on public.pulseboard_workspaces;
create policy "pulseboard_workspaces_insert_owner" on public.pulseboard_workspaces
  for insert to authenticated
  with check (owner_id = auth.uid());

revoke execute on function public.pulseboard_handle_workspace_created() from public, anon, authenticated;
