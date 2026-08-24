import { NextRequest, NextResponse } from "next/server";
import { createSyncRun, decryptPulseboardSecret, requireWorkspaceAccess, type StoredCredential, writeIntegrationAudit } from "../../../../../lib/pulseboard-integration-server";
import { createSupabaseAdminClient } from "../../../../../lib/supabase-server";

export const runtime = "nodejs";

type HubSpotItem = { id: string; properties?: Record<string, string | null> };
const dollarsToCents = (value: string | null | undefined) => { const number = Number(value); return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : 0; };
const stage = (value: string | null | undefined) => { const normalized = (value ?? "").toLowerCase(); if (normalized.includes("lost")) return "lost"; if (normalized.includes("won")) return "won"; if (normalized.includes("negotiat")) return "negotiation"; if (normalized.includes("proposal")) return "proposal"; return "qualified"; };

async function listHubSpot(token: string, object: "companies" | "contacts" | "deals", properties: string) {
  const response = await fetch(`https://api.hubapi.com/crm/v3/objects/${object}?limit=100&properties=${encodeURIComponent(properties)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const body = await response.json() as { results?: HubSpotItem[]; message?: string };
  if (!response.ok || !Array.isArray(body.results)) throw new Error(body.message ?? `HubSpot ${object} sync failed.`);
  return body.results;
}

export async function POST(request: NextRequest) {
  let runId: string | null = null;
  let admin: ReturnType<typeof createSupabaseAdminClient> | null = null;
  try {
    const { workspaceId } = await request.json() as { workspaceId?: string };
    if (!workspaceId) return NextResponse.json({ error: "Choose a workspace before syncing HubSpot." }, { status: 400 });
    const { user } = await requireWorkspaceAccess(request, workspaceId);
    admin = createSupabaseAdminClient();
    const { data: integration, error: integrationError } = await admin.from("pulseboard_integrations").select("id, status").eq("workspace_id", workspaceId).eq("provider", "hubspot").maybeSingle();
    if (integrationError || !integration || integration.status !== "connected") return NextResponse.json({ error: "Connect HubSpot before running a manual sync." }, { status: 409 });
    const { data: secret, error: secretError } = await admin.from("pulseboard_integration_secrets").select("credential_ciphertext").eq("integration_id", integration.id).maybeSingle();
    if (secretError || !secret) return NextResponse.json({ error: "HubSpot credentials are unavailable. Reconnect HubSpot and try again." }, { status: 409 });
    const credential = JSON.parse(decryptPulseboardSecret(secret.credential_ciphertext)) as StoredCredential;
    const run = await createSyncRun({ workspaceId, integrationId: integration.id, provider: "hubspot", userId: user.id });
    runId = run.runId;
    const [companies, contacts, deals] = await Promise.all([
      listHubSpot(credential.accessToken, "companies", "name,annualrevenue"),
      listHubSpot(credential.accessToken, "contacts", "firstname,lastname,email,jobtitle"),
      listHubSpot(credential.accessToken, "deals", "dealname,amount,dealstage,closedate"),
    ]);
    const now = new Date().toISOString();
    const customerRows = companies.map((company) => ({ workspace_id: workspaceId, name: company.properties?.name?.trim() || `HubSpot company ${company.id}`, segment: null, lifecycle_stage: "lead", health_status: "watch", health_score: 50, annual_value_cents: dollarsToCents(company.properties?.annualrevenue), external_source: "hubspot", external_id: company.id, updated_at: now }));
    const contactRows = contacts.map((contact) => ({ workspace_id: workspaceId, full_name: [contact.properties?.firstname, contact.properties?.lastname].filter(Boolean).join(" ").trim() || `HubSpot contact ${contact.id}`, email: contact.properties?.email?.trim() || null, job_title: contact.properties?.jobtitle?.trim() || null, external_source: "hubspot", external_id: contact.id, updated_at: now }));
    const dealRows = deals.map((deal) => ({ workspace_id: workspaceId, name: deal.properties?.dealname?.trim() || `HubSpot deal ${deal.id}`, stage: stage(deal.properties?.dealstage), value_cents: dollarsToCents(deal.properties?.amount), probability: 0, expected_close_date: deal.properties?.closedate ? deal.properties.closedate.slice(0, 10) : null, external_source: "hubspot", external_id: deal.id, updated_at: now }));
    if (customerRows.length) await admin.from("pulseboard_customers").upsert(customerRows, { onConflict: "workspace_id,external_source,external_id" });
    if (contactRows.length) await admin.from("pulseboard_contacts").upsert(contactRows, { onConflict: "workspace_id,external_source,external_id" });
    if (dealRows.length) await admin.from("pulseboard_deals").upsert(dealRows, { onConflict: "workspace_id,external_source,external_id" });
    const total = customerRows.length + contactRows.length + dealRows.length;
    await admin.from("pulseboard_sync_runs").update({ status: "succeeded", finished_at: now, records_seen: total, records_written: total, details: { kind: "crm_objects", companies: customerRows.length, contacts: contactRows.length, deals: dealRows.length } }).eq("id", runId);
    await admin.from("pulseboard_integrations").update({ last_synced_at: now, last_error: null }).eq("id", integration.id);
    await writeIntegrationAudit({ workspaceId, actorId: user.id, action: "integration.hubspot.synced", targetId: integration.id, details: { companies: customerRows.length, contacts: contactRows.length, deals: dealRows.length, mode: "manual" } });
    return NextResponse.json({ companies: customerRows.length, contacts: contactRows.length, deals: dealRows.length });
  } catch (error) {
    if (admin && runId) await admin.from("pulseboard_sync_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_message: error instanceof Error ? error.message : "HubSpot sync failed." }).eq("id", runId);
    return NextResponse.json({ error: error instanceof Error ? error.message : "HubSpot manual sync failed." }, { status: 500 });
  }
}
