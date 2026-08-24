import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../../lib/supabase-server";
import { callbackUrl, encryptPulseboardSecret, parseOAuthState, publicOrigin, writeIntegrationAudit } from "../../../../../lib/pulseboard-integration-server";

export const runtime = "nodejs";

function finish(request: NextRequest, status: "connected" | "error", detail?: string) {
  const url = new URL("/", publicOrigin(request));
  url.searchParams.set("integration", "github");
  url.searchParams.set("status", status);
  if (detail) url.searchParams.set("detail", detail.slice(0, 120));
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateValue = request.nextUrl.searchParams.get("state");
  if (!code || !stateValue) return finish(request, "error", "GitHub did not return a valid authorization code.");
  try {
    const state = parseOAuthState(stateValue, "github");
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) return finish(request, "error", "GitHub OAuth server credentials are missing.");
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: callbackUrl(request, "github"), code_verifier: state.codeVerifier }) });
    const token = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string };
    if (!tokenResponse.ok || !token.access_token) return finish(request, "error", token.error ?? "GitHub token exchange failed.");
    const identityResponse = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${token.access_token}`, "X-GitHub-Api-Version": "2022-11-28", Accept: "application/vnd.github+json" } });
    const identity = await identityResponse.json() as { login?: string; id?: number };
    if (!identityResponse.ok || !identity.login) return finish(request, "error", "GitHub account verification failed.");
    const admin = createSupabaseAdminClient();
    const { data: integration, error: integrationError } = await admin.from("pulseboard_integrations").upsert({ workspace_id: state.workspaceId, provider: "github", status: "connected", account_label: identity.login, scopes: token.scope?.split(/[ ,]+/).filter(Boolean) ?? [], metadata: { github_user_id: identity.id ?? null, login: identity.login }, connected_by: state.userId, connected_at: new Date().toISOString(), last_error: null }, { onConflict: "workspace_id,provider" }).select("id").single();
    if (integrationError || !integration) return finish(request, "error", "PulseBoard could not save the GitHub connection.");
    const credential = encryptPulseboardSecret(JSON.stringify({ accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined, scopes: token.scope?.split(/[ ,]+/).filter(Boolean) }));
    const { error: secretError } = await admin.from("pulseboard_integration_secrets").upsert({ integration_id: integration.id, credential_ciphertext: credential, updated_at: new Date().toISOString() });
    if (secretError) return finish(request, "error", "PulseBoard could not securely store the GitHub connection.");
    await writeIntegrationAudit({ workspaceId: state.workspaceId, actorId: state.userId, action: "integration.github.connected", targetId: integration.id, details: { account: identity.login } });
    return finish(request, "connected");
  } catch { return finish(request, "error", "GitHub connection could not be completed."); }
}
