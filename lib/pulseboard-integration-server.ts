import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { createSupabaseAdminClient, createSupabaseUserClient } from "./supabase-server";

export type Provider = "github" | "hubspot";
export type OAuthState = { provider: Provider; workspaceId: string; userId: string; codeVerifier: string; expiresAt: number };
export type StoredCredential = { accessToken: string; refreshToken?: string; expiresAt?: number; scopes?: string[] };

function encryptionKey() {
  const encoded = process.env.PULSEBOARD_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("PulseBoard token encryption key is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("PulseBoard token encryption key must be a 32-byte base64 value.");
  return key;
}

export function encryptPulseboardSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptPulseboardSecret(value: string) {
  const [version, ivValue, tagValue, ciphertextValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) throw new Error("Stored credential cannot be decrypted.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
}

export function createCodeVerifier() { return randomBytes(48).toString("base64url"); }
export function createCodeChallenge(verifier: string) { return createHash("sha256").update(verifier).digest("base64url"); }
export function createOAuthState(state: OAuthState) { return encryptPulseboardSecret(JSON.stringify(state)); }
export function parseOAuthState(state: string, provider: Provider) {
  const value = JSON.parse(decryptPulseboardSecret(state)) as OAuthState;
  if (value.provider !== provider || value.expiresAt < Date.now() || !value.workspaceId || !value.userId || !value.codeVerifier) throw new Error("OAuth state expired or is invalid.");
  return value;
}

function tokenFrom(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export async function requireWorkspaceAccess(request: NextRequest, workspaceId: string) {
  const accessToken = tokenFrom(request);
  if (!accessToken) throw new Error("Sign in before using integrations.");
  const userClient = createSupabaseUserClient(accessToken);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) throw new Error("Your session could not be verified. Please sign in again.");
  const { data: workspace, error: workspaceError } = await userClient.from("pulseboard_workspaces").select("id, name").eq("id", workspaceId).maybeSingle();
  if (workspaceError || !workspace) throw new Error("This workspace is unavailable to your account.");
  return { user: userData.user, workspace, userClient };
}

export function publicOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return configured && /^https:\/\//.test(configured) ? configured : request.nextUrl.origin;
}

export function callbackUrl(request: NextRequest, provider: Provider) { return `${publicOrigin(request)}/api/integrations/${provider}/callback`; }

export async function writeIntegrationAudit(input: { workspaceId: string; actorId: string; action: string; targetId?: string; details?: Record<string, unknown> }) {
  const admin = createSupabaseAdminClient();
  await admin.from("pulseboard_audit_events").insert({ workspace_id: input.workspaceId, actor_id: input.actorId, action: input.action, target_type: "integration", target_id: input.targetId ?? null, details: input.details ?? {} });
}

export async function createSyncRun(input: { workspaceId: string; integrationId: string; provider: Provider; userId: string }) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("pulseboard_sync_runs").insert({ workspace_id: input.workspaceId, integration_id: input.integrationId, provider: input.provider, requested_by: input.userId }).select("id").single();
  if (error || !data) throw new Error("Could not create an integration sync record.");
  return { admin, runId: data.id };
}
