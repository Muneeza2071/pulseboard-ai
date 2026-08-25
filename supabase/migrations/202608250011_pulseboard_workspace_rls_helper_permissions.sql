-- RLS policies execute these SECURITY DEFINER predicate helpers for browser-authenticated users.
-- Keep them unavailable to public and anon roles, while allowing policy evaluation for authenticated sessions.
revoke execute on function public.pulseboard_is_workspace_member(uuid) from public, anon;
revoke execute on function public.pulseboard_can_manage_workspace(uuid) from public, anon;

grant execute on function public.pulseboard_is_workspace_member(uuid) to authenticated;
grant execute on function public.pulseboard_can_manage_workspace(uuid) to authenticated;
