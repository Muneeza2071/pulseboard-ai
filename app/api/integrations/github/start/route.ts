import { NextRequest, NextResponse } from "next/server";
import { callbackUrl, createCodeChallenge, createCodeVerifier, createOAuthState, requireWorkspaceAccess } from "../../../../../lib/pulseboard-integration-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { workspaceId } = await request.json() as { workspaceId?: string };
    if (!workspaceId) return NextResponse.json({ error: "Choose a workspace before connecting GitHub." }, { status: 400 });
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) return NextResponse.json({ error: "GitHub OAuth is not activated yet. Add the server-only GitHub client ID and secret in Vercel." }, { status: 503 });
    const { user } = await requireWorkspaceAccess(request, workspaceId);
    const codeVerifier = createCodeVerifier();
    const state = createOAuthState({ provider: "github", workspaceId, userId: user.id, codeVerifier, expiresAt: Date.now() + 10 * 60 * 1000 });
    const authorization = new URL("https://github.com/login/oauth/authorize");
    authorization.searchParams.set("client_id", clientId);
    authorization.searchParams.set("redirect_uri", callbackUrl(request, "github"));
    authorization.searchParams.set("scope", "read:user repo offline_access");
    authorization.searchParams.set("state", state);
    authorization.searchParams.set("code_challenge", createCodeChallenge(codeVerifier));
    authorization.searchParams.set("code_challenge_method", "S256");
    return NextResponse.json({ url: authorization.toString() });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "GitHub connection could not start." }, { status: 400 }); }
}
