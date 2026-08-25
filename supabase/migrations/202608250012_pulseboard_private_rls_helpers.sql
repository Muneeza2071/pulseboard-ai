-- Keep RLS predicate helpers out of the browser-exposed public schema.
-- Authenticated policies still need EXECUTE, but the functions are no longer RPC-addressable through public.
create schema if not exists pulseboard_private;
revoke all on schema pulseboard_private from public, anon, authenticated;

alter function public.pulseboard_is_workspace_member(uuid) set schema pulseboard_private;
alter function public.pulseboard_can_manage_workspace(uuid) set schema pulseboard_private;

grant usage on schema pulseboard_private to authenticated;
grant execute on function pulseboard_private.pulseboard_is_workspace_member(uuid) to authenticated;
grant execute on function pulseboard_private.pulseboard_can_manage_workspace(uuid) to authenticated;

revoke all on function pulseboard_private.pulseboard_is_workspace_member(uuid) from public, anon;
revoke all on function pulseboard_private.pulseboard_can_manage_workspace(uuid) from public, anon;
