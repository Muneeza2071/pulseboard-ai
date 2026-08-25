-- Creates one workspace only for the authenticated caller.
-- RLS stays enabled on pulseboard_workspaces; this narrowly scoped RPC owns the insert.
create or replace function public.pulseboard_create_workspace(
  p_name text,
  p_slug text
)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  cleaned_name text := btrim(p_name);
  cleaned_slug text := btrim(p_slug);
begin
  if current_user_id is null then
    raise exception 'Authentication is required to create a workspace';
  end if;

  if char_length(cleaned_name) < 2 or char_length(cleaned_name) > 80 then
    raise exception 'Workspace name must contain 2 to 80 characters';
  end if;

  if cleaned_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Workspace slug is invalid';
  end if;

  return query
  insert into public.pulseboard_workspaces (name, slug, owner_id)
  values (cleaned_name, cleaned_slug, current_user_id)
  returning pulseboard_workspaces.id, pulseboard_workspaces.name;
end;
$$;

revoke all on function public.pulseboard_create_workspace(text, text) from public, anon;
grant execute on function public.pulseboard_create_workspace(text, text) to authenticated;
