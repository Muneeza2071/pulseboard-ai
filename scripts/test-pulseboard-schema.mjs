import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationDir = join(process.cwd(), "supabase", "migrations");
const migrationFiles = [
  "202608230001_pulseboard_foundation.sql",
  "202608230002_pulseboard_function_permissions.sql",
  "202608230003_pulseboard_workspace_onboarding.sql",
  "202608230004_pulseboard_performance_indexes.sql",
  "202608230005_pulseboard_crm_contacts.sql",
  "202608230006_pulseboard_ai_insight_runs.sql",
  "202608230007_pulseboard_integrations.sql",
  "202608230008_pulseboard_external_record_identity.sql",
  "202608230009_pulseboard_external_identity_upsert_indexes.sql",
  "202608230010_pulseboard_integration_secrets_deny_policy.sql",
  "202608250011_pulseboard_workspace_rls_helper_permissions.sql",
  "202608250012_pulseboard_private_rls_helpers.sql",
  "202608250013_pulseboard_secure_workspace_creation_rpc.sql",
];
const sql = migrationFiles.map((file) => readFileSync(join(migrationDir, file), "utf8")).join("\n");

const tables = [
  "pulseboard_profiles",
  "pulseboard_workspaces",
  "pulseboard_workspace_members",
  "pulseboard_customers",
  "pulseboard_contacts",
  "pulseboard_deals",
  "pulseboard_metric_definitions",
  "pulseboard_metric_snapshots",
  "pulseboard_activity_events",
  "pulseboard_audit_events",
  "pulseboard_ai_insight_runs",
  "pulseboard_integrations",
  "pulseboard_integration_secrets",
  "pulseboard_integration_repositories",
  "pulseboard_sync_runs",
];

for (const table of tables) {
  assert.match(sql, new RegExp(`public\\.${table}`), `missing ${table}`);
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${table} must enable RLS`);
}

assert.match(sql, /pulseboard_workspaces_insert_owner[\s\S]*owner_id = \(select auth\.uid\(\)\)/, "workspace ownership must be bound to auth.uid()");
assert.match(sql, /pulseboard_handle_workspace_created[\s\S]*pulseboard_workspace_members/, "workspace creation must add owner membership through trigger");
assert.match(sql, /create or replace function public\.pulseboard_create_workspace[\s\S]*current_user_id uuid := auth\.uid\(\)/, "workspace RPC must bind creation to the authenticated caller");
assert.match(sql, /insert into public\.pulseboard_workspaces \(name, slug, owner_id\)[\s\S]*current_user_id/, "workspace RPC must never accept a caller-supplied owner id");
assert.match(sql, /revoke all on function public\.pulseboard_create_workspace\(text, text\) from public, anon/, "workspace RPC must not be exposed to public or anon roles");
assert.match(sql, /grant execute on function public\.pulseboard_create_workspace\(text, text\) to authenticated/, "workspace RPC must only be executable by authenticated users");
assert.match(sql, /pulseboard_contacts_members_all[\s\S]*pulseboard_is_workspace_member\(workspace_id\)/, "contacts must be workspace RLS-scoped");
assert.match(sql, /create trigger pulseboard_deals_customer_workspace_guard/i, "deals must validate customer workspace boundaries");
assert.match(sql, /create trigger pulseboard_contacts_customer_workspace_guard/i, "contacts must validate customer workspace boundaries");
assert.match(sql, /revoke execute on function public\.pulseboard_handle_new_auth_user\(\) from public, anon, authenticated/, "auth trigger helper must not be exposed as RPC");
assert.match(sql, /revoke execute on function public\.pulseboard_is_workspace_member\(uuid\) from public, anon/, "RLS helper must remain unavailable to public and anon roles");
assert.match(sql, /grant execute on function public\.pulseboard_is_workspace_member\(uuid\) to authenticated/, "workspace membership RLS helper must be executable for authenticated policy evaluation");
assert.match(sql, /grant execute on function public\.pulseboard_can_manage_workspace\(uuid\) to authenticated/, "workspace manager RLS helper must be executable for authenticated policy evaluation");
assert.match(sql, /alter function public\.pulseboard_is_workspace_member\(uuid\) set schema pulseboard_private/, "workspace membership RLS helper must move out of the browser-exposed schema");
assert.match(sql, /grant execute on function pulseboard_private\.pulseboard_is_workspace_member\(uuid\) to authenticated/, "private workspace membership RLS helper must remain callable by authenticated policy evaluation");
assert.match(sql, /revoke execute on function public\.pulseboard_validate_customer_workspace\(\) from public, anon, authenticated/, "customer workspace guard must not be exposed as RPC");
assert.match(sql, /pulseboard_ai_insights_select_members[\s\S]*pulseboard_is_workspace_member\(workspace_id\)/, "AI insight history must be workspace RLS-scoped");
assert.match(sql, /pulseboard_integrations_select_members[\s\S]*pulseboard_is_workspace_member\(workspace_id\)/, "integration status must be workspace RLS-scoped");
assert.match(sql, /revoke all on public\.pulseboard_integration_secrets from anon, authenticated/, "encrypted credentials must not be readable by browser roles");
assert.match(sql, /pulseboard_integration_secrets_server_only[\s\S]*using \(false\)/, "credential table needs an explicit browser deny policy");
assert.match(sql, /pulseboard_customers_external_identity_idx/, "customers need an external identity index for manual sync");
assert.match(sql, /pulseboard_deals_external_identity_idx/, "deals need an external identity index for manual sync");
assert.match(sql, /pulseboard_deals_customer_idx/, "customer foreign key must have an index");
assert.doesNotMatch(sql, /service_role/i, "service role keys must never appear in migrations");
assert.doesNotMatch(sql, /create table if not exists public\.(?!pulseboard_)/, "migration must not create non-PulseBoard public tables");

console.log("PulseBoard schema contract passed.");
