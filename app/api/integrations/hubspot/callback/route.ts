import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../../lib/supabase-server";
import { callbackUrl, encryptPulseboardSecret, parseOAuthState, publicOrigin, writeIntegrationAudit } from "../../../../../lib/pulseboard-integration-server";

export const runtime = "nodejs";

function finish(request: NextRequest, status: "connected" | "error", detail?: string) {
  const url = new URL("/", publicOrigin(request));
  url.searchParams.set("integration", "hubspot");
  url.searchParams.set("status", status);
  if (detail) url.searchParams.set("detail", detail.slice(0, 120));
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateValue = request.nextUrl.searchParams.get("state");
  if (!code || !stateValue) return finish(request, "error", "HubSpot did not return a valid authorization code.");
  try {
    const state = parseOAuthState(stateValue, "hubspot");
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    if (!clientId || !clientSecret) return finish(request, "error", "HubSpot OAuth server credentials are missing.");
    const tokenResponse = await fetch("https://api.hubapi.com/oauth/v3/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, redirect_uri: callbackUrl(request, "hubspot"), code }) });
    const token = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; token_type?: string; scope?: string; error?: string };
    if (!tokenResponse.ok || !token.access_token) return finish(request, "error", token.error ?? "HubSpot token exchange failed.");
    const admin = createSupabaseAdminClient();
    const { data: integration, error: integrationError } = await admin.from("pulseboard_integrations").upsert({ workspace_id: state.workspaceId, provider: "hubspot", status: "connected", account_label: "HubSpot account", scopes: token.scope?.split(" ").filter(Boolean) ?? [], metadata: { token_type: token.token_type ?? "bearer" }, connected_by: state.userId, connected_at: new Date().toISOString(), last_error: null }, { onConflict: "workspace_id,provider" }).select("id").single();
    if (integrationError || !integration) return finish(request, "error", "PulseBoard could not save the HubSpot connection.");
    const credential = encryptPulseboardSecret(JSON.stringify({ accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined, scopes: token.scope?.split(" ").filter(Boolean) }));
    const { error: secretError } = await admin.from("pulseboard_integration_secrets").upsert({ integration_id: integration.id, credential_ciphertext: credential, updated_at: new Date().toISOString() });
    if (secretError) return finish(request, "error", "PulseBoard could not securely store the HubSpot connection.");
    await writeIntegrationAudit({ workspaceId: state.workspaceId, actorId: state.userId, action: "integration.hubspot.connected", targetId: integration.id });
    return finish(request, "connected");
  } catch { return finish(request, "error", "HubSpot connection could not be completed."); }
}
