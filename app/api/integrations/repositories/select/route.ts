import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess, writeIntegrationAudit } from "../../../../../lib/pulseboard-integration-server";
import { createSupabaseAdminClient } from "../../../../../lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { workspaceId, repositoryId, selected } = await request.json() as { workspaceId?: string; repositoryId?: string; selected?: boolean };
    if (!workspaceId || !repositoryId || typeof selected !== "boolean") return NextResponse.json({ error: "Choose a repository and selection state." }, { status: 400 });
    const { user } = await requireWorkspaceAccess(request, workspaceId);
    const admin = createSupabaseAdminClient();
    const { data: repository } = await admin.from("pulseboard_integration_repositories").select("id, full_name, integration_id").eq("id", repositoryId).eq("workspace_id", workspaceId).maybeSingle();
    if (!repository) return NextResponse.json({ error: "That repository is unavailable to this workspace." }, { status: 404 });
    const { error } = await admin.from("pulseboard_integration_repositories").update({ selected }).eq("id", repository.id).eq("workspace_id", workspaceId);
    if (error) return NextResponse.json({ error: "Repository selection could not be saved." }, { status: 500 });
    await writeIntegrationAudit({ workspaceId, actorId: user.id, action: selected ? "integration.github.repository_selected" : "integration.github.repository_unselected", targetId: repository.integration_id, details: { repository: repository.full_name } });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Repository selection failed." }, { status: 500 }); }
}
