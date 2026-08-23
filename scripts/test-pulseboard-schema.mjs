import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationDir = join(process.cwd(), "supabase", "migrations");
const migrationFiles = [
  "202608230001_pulseboard_foundation.sql",
  "202608230002_pulseboard_function_permissions.sql",
  "202608230003_pulseboard_workspace_onboarding.sql",
  "202608230004_pulseboard_performance_indexes.sql",
];
const sql = migrationFiles.map((file) => readFileSync(join(migrationDir, file), "utf8")).join("\n");

const tables = [
  "pulseboard_profiles",
  "pulseboard_workspaces",
  "pulseboard_workspace_members",
  "pulseboard_customers",
  "pulseboard_deals",
  "pulseboard_metric_definitions",
  "pulseboard_metric_snapshots",
  "pulseboard_activity_events",
  "pulseboard_audit_events",
];

for (const table of tables) {
  assert.match(sql, new RegExp(`public\\.${table}`), `missing ${table}`);
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${table} must enable RLS`);
}

assert.match(sql, /pulseboard_workspaces_insert_owner[\s\S]*owner_id = \(select auth\.uid\(\)\)/, "workspace ownership must be bound to auth.uid()");
assert.match(sql, /pulseboard_handle_workspace_created[\s\S]*pulseboard_workspace_members/, "workspace creation must add owner membership through trigger");
assert.match(sql, /revoke execute on function public\.pulseboard_handle_new_auth_user\(\) from public, anon, authenticated/, "auth trigger helper must not be exposed as RPC");
assert.match(sql, /revoke execute on function public\.pulseboard_is_workspace_member\(uuid\) from public, anon, authenticated/, "RLS helper must not be exposed as RPC");
assert.match(sql, /pulseboard_deals_customer_idx/, "customer foreign key must have an index");
assert.doesNotMatch(sql, /service_role/i, "service role keys must never appear in migrations");
assert.doesNotMatch(sql, /create table if not exists public\.(?!pulseboard_)/, "migration must not create non-PulseBoard public tables");

console.log("PulseBoard schema contract passed.");
