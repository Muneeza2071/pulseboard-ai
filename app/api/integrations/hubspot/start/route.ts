import { NextRequest, NextResponse } from "next/server";
import { callbackUrl, createOAuthState, requireWorkspaceAccess } from "../../../../../lib/pulseboard-integration-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { workspaceId } = await request.json() as { workspaceId?: string };
    if (!workspaceId) return NextResponse.json({ error: "Choose a workspace before connecting HubSpot." }, { status: 400 });
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    if (!clientId) return NextResponse.json({ error: "HubSpot OAuth is not activated yet. Add the server-only HubSpot client ID and secret in Vercel." }, { status: 503 });
    const { user } = await requireWorkspaceAccess(request, workspaceId);
    const state = createOAuthState({ provider: "hubspot", workspaceId, userId: user.id, codeVerifier: "hubspot-server-flow", expiresAt: Date.now() + 10 * 60 * 1000 });
    const authorization = new URL("https://app.hubspot.com/oauth/authorize");
    authorization.searchParams.set("client_id", clientId);
    authorization.searchParams.set("redirect_uri", callbackUrl(request, "hubspot"));
    authorization.searchParams.set("scope", "crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read");
    authorization.searchParams.set("state", state);
    return NextResponse.json({ url: authorization.toString() });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "HubSpot connection could not start." }, { status: 400 }); }
}
