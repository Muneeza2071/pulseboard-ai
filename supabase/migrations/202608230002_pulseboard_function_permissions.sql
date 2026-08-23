-- Follow-up hardening for the shared Supabase project.
-- Internal RLS and auth-trigger helpers must not be exposed through PostgREST RPC.

revoke execute on function public.pulseboard_handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.pulseboard_is_workspace_member(uuid) from public, anon, authenticated;
revoke execute on function public.pulseboard_can_manage_workspace(uuid) from public, anon, authenticated;
