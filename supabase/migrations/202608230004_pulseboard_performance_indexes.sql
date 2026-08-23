-- Cover PulseBoard foreign keys and make direct auth.uid() policy checks init-plan friendly.

create index if not exists pulseboard_workspaces_owner_idx on public.pulseboard_workspaces(owner_id);
create index if not exists pulseboard_customers_owner_idx on public.pulseboard_customers(owner_id);
create index if not exists pulseboard_deals_customer_idx on public.pulseboard_deals(customer_id);
create index if not exists pulseboard_deals_owner_idx on public.pulseboard_deals(owner_id);
create index if not exists pulseboard_activity_actor_idx on public.pulseboard_activity_events(actor_id);
create index if not exists pulseboard_audit_actor_idx on public.pulseboard_audit_events(actor_id);

drop policy if exists "pulseboard_profiles_select_own" on public.pulseboard_profiles;
create policy "pulseboard_profiles_select_own" on public.pulseboard_profiles
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "pulseboard_profiles_update_own" on public.pulseboard_profiles;
create policy "pulseboard_profiles_update_own" on public.pulseboard_profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "pulseboard_workspaces_insert_owner" on public.pulseboard_workspaces;
create policy "pulseboard_workspaces_insert_owner" on public.pulseboard_workspaces
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "pulseboard_members_delete_managers_or_self" on public.pulseboard_workspace_members;
create policy "pulseboard_members_delete_managers_or_self" on public.pulseboard_workspace_members
  for delete to authenticated using (user_id = (select auth.uid()) or public.pulseboard_can_manage_workspace(workspace_id));
