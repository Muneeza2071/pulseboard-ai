-- Add an explicit deny policy so the security advisor recognizes that browser roles cannot read encrypted integration credentials.

drop policy if exists "pulseboard_integration_secrets_server_only" on public.pulseboard_integration_secrets;
create policy "pulseboard_integration_secrets_server_only"
  on public.pulseboard_integration_secrets
  for select to authenticated
  using (false);
