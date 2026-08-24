import { NextRequest, NextResponse } from "next/server";
import { createSyncRun, decryptPulseboardSecret, requireWorkspaceAccess, type StoredCredential, writeIntegrationAudit } from "../../../../../lib/pulseboard-integration-server";
import { createSupabaseAdminClient } from "../../../../../lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { workspaceId } = await request.json() as { workspaceId?: string };
    if (!workspaceId) return NextResponse.json({ error: "Choose a workspace before syncing GitHub." }, { status: 400 });
    const { user } = await requireWorkspaceAccess(request, workspaceId);
    const admin = createSupabaseAdminClient();
    const { data: integration, error: integrationError } = await admin.from("pulseboard_integrations").select("id, status").eq("workspace_id", workspaceId).eq("provider", "github").maybeSingle();
    if (integrationError || !integration || integration.status !== "connected") return NextResponse.json({ error: "Connect GitHub before running a manual sync." }, { status: 409 });
    const { data: secret, error: secretError } = await admin.from("pulseboard_integration_secrets").select("credential_ciphertext").eq("integration_id", integration.id).maybeSingle();
    if (secretError || !secret) return NextResponse.json({ error: "GitHub credentials are unavailable. Reconnect GitHub and try again." }, { status: 409 });
    const credential = JSON.parse(decryptPulseboardSecret(secret.credential_ciphertext)) as StoredCredential;
    const { runId } = await createSyncRun({ workspaceId, integrationId: integration.id, provider: "github", userId: user.id });
    const reposResponse = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", { headers: { Authorization: `Bearer ${credential.accessToken}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, cache: "no-store" });
    const repos = await reposResponse.json() as Array<{ id: number; full_name: string; default_branch: string | null; private: boolean }>;
    if (!reposResponse.ok || !Array.isArray(repos)) throw new Error("GitHub did not return repositories for this account.");
    if (repos.length) await admin.from("pulseboard_integration_repositories").upsert(repos.map((repo) => ({ workspace_id: workspaceId, integration_id: integration.id, provider_repository_id: String(repo.id), full_name: repo.full_name, default_branch: repo.default_branch, metadata: { private: repo.private }, last_seen_at: new Date().toISOString() })), { onConflict: "integration_id,provider_repository_id", ignoreDuplicates: false });
    await admin.from("pulseboard_sync_runs").update({ status: "succeeded", finished_at: new Date().toISOString(), records_seen: repos.length, records_written: repos.length, details: { kind: "repository_catalog" } }).eq("id", runId);
    await admin.from("pulseboard_integrations").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("id", integration.id);
    await writeIntegrationAudit({ workspaceId, actorId: user.id, action: "integration.github.synced", targetId: integration.id, details: { repositories: repos.length, mode: "manual" } });
    return NextResponse.json({ repositories: repos.map((repo) => ({ id: String(repo.id), name: repo.full_name, defaultBranch: repo.default_branch, private: repo.private })) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "GitHub manual sync failed." }, { status: 500 }); }
}
