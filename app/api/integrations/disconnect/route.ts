import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess, type Provider, writeIntegrationAudit } from "../../../../lib/pulseboard-integration-server";
import { createSupabaseAdminClient } from "../../../../lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { workspaceId, provider } = await request.json() as { workspaceId?: string; provider?: Provider };
    if (!workspaceId || (provider !== "github" && provider !== "hubspot")) return NextResponse.json({ error: "Choose a valid integration to disconnect." }, { status: 400 });
    const { user } = await requireWorkspaceAccess(request, workspaceId);
    const admin = createSupabaseAdminClient();
    const { data: integration } = await admin.from("pulseboard_integrations").select("id").eq("workspace_id", workspaceId).eq("provider", provider).maybeSingle();
    if (!integration) return NextResponse.json({ error: "This integration is not connected." }, { status: 404 });
    await admin.from("pulseboard_integration_secrets").delete().eq("integration_id", integration.id);
    await admin.from("pulseboard_integrations").update({ status: "disconnected", account_label: null, scopes: [], metadata: {}, connected_by: null, connected_at: null, last_error: null }).eq("id", integration.id);
    await writeIntegrationAudit({ workspaceId, actorId: user.id, action: `integration.${provider}.disconnected`, targetId: integration.id });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Integration disconnect failed." }, { status: 500 }); }
}
