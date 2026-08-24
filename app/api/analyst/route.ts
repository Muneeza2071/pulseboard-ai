import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseUserClient } from "../../../lib/supabase-server";

export const runtime = "nodejs";

type Customer = { name: string; lifecycle_stage: string; health_status: string; health_score: number; annual_value_cents: number };
type Deal = { name: string; stage: string; value_cents: number; probability: number; expected_close_date: string | null };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function readBearer(request: NextRequest) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function asQuestion(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 600) : "";
}

function asWorkspaceId(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value) ? value : "";
}

export async function POST(request: NextRequest) {
  const accessToken = readBearer(request);
  if (!accessToken) return jsonError("Sign in before asking the AI Analyst.", 401);

  let body: { workspaceId?: unknown; question?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid AI Analyst request.", 400); }
  const workspaceId = asWorkspaceId(body.workspaceId);
  const question = asQuestion(body.question);
  if (!workspaceId || question.length < 2) return jsonError("Choose a workspace and ask a clear question.", 400);

  const baseUrl = process.env.PULSEBOARD_AI_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.PULSEBOARD_AI_API_KEY;
  const model = process.env.PULSEBOARD_AI_MODEL;
  if (!baseUrl || !apiKey || !model) {
    return jsonError("AI Analyst is not activated yet. Configure the server-only AI provider values in Vercel.", 503);
  }

  try {
    const userClient = createSupabaseUserClient(accessToken);
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return jsonError("Your session could not be verified. Please sign in again.", 401);

    const [workspaceResult, customerResult, dealResult, contactResult] = await Promise.all([
      userClient.from("pulseboard_workspaces").select("id, name").eq("id", workspaceId).maybeSingle(),
      userClient.from("pulseboard_customers").select("name, lifecycle_stage, health_status, health_score, annual_value_cents").eq("workspace_id", workspaceId).order("health_score", { ascending: true }).limit(100),
      userClient.from("pulseboard_deals").select("name, stage, value_cents, probability, expected_close_date").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100),
      userClient.from("pulseboard_contacts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    ]);
    const dataError = workspaceResult.error ?? customerResult.error ?? dealResult.error ?? contactResult.error;
    if (dataError || !workspaceResult.data) return jsonError("This workspace is unavailable to your account.", 403);

    const customers = (customerResult.data ?? []) as Customer[];
    const deals = (dealResult.data ?? []) as Deal[];
    const evidence = {
      workspace: workspaceResult.data.name,
      customer_count: customers.length,
      contact_count: contactResult.count ?? 0,
      deal_count: deals.length,
      customers: customers.map((customer) => ({ name: customer.name, lifecycle: customer.lifecycle_stage, health: customer.health_status, score: customer.health_score, annual_value_usd: Number((customer.annual_value_cents / 100).toFixed(2)) })),
      deals: deals.map((deal) => ({ name: deal.name, stage: deal.stage, value_usd: Number((deal.value_cents / 100).toFixed(2)), probability: deal.probability, expected_close_date: deal.expected_close_date })),
    };
    const prompt = [
      "You are PulseBoard AI Analyst. Answer only from the provided workspace evidence.",
      "Never invent metrics, integrations, customer events, or actions. If evidence is incomplete, state exactly what is missing.",
      "Give a concise decision-oriented response with: 1) direct answer, 2) evidence, 3) next action. Keep under 350 words.",
      `Question: ${question}`,
      `Workspace evidence JSON: ${JSON.stringify(evidence)}`,
    ].join("\n\n");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: "You are a careful customer intelligence analyst." }, { role: "user", content: prompt }], temperature: 0.2, max_tokens: 700 }),
      cache: "no-store",
    });
    if (!response.ok) return jsonError("The AI provider is temporarily unavailable. Please try again later.", 502);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const answer = payload.choices?.[0]?.message?.content?.trim();
    if (!answer) return jsonError("The AI provider returned no usable analysis. Please try again.", 502);

    try {
      const admin = createSupabaseAdminClient();
      await admin.from("pulseboard_ai_insight_runs").insert({ workspace_id: workspaceId, requested_by: userData.user.id, question, answer, model, evidence });
    } catch {
      // A valid answer is still returned. Private audit history activates after the server database credential is configured.
    }
    return NextResponse.json({ answer, evidence: { customerCount: customers.length, contactCount: contactResult.count ?? 0, dealCount: deals.length }, model });
  } catch {
    return jsonError("AI Analyst could not complete this request safely. Please try again.", 500);
  }
}
