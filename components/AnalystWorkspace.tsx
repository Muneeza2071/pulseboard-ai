"use client";

import { type FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, BarChart3, Bot, Building2, HeartPulse, LoaderCircle, Sparkles } from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type Workspace = { id: string; name: string };
type AnalystResponse = { answer: string; evidence: { customerCount: number; contactCount: number; dealCount: number }; model: string };

export function AnalystWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [draft, setDraft] = useState("Which customer accounts need attention this week?");
  const [answer, setAnswer] = useState("");
  const [notice, setNotice] = useState("");
  const [evidence, setEvidence] = useState<AnalystResponse["evidence"] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setLoadingWorkspace(false); return; }
    void supabase.from("pulseboard_workspaces").select("id, name").limit(1).maybeSingle().then(({ data }) => { setWorkspace(data ?? null); setLoadingWorkspace(false); });
  }, []);

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    if (!workspace) { setNotice("Sign in and create a workspace before asking the AI Analyst."); return; }
    const question = draft.trim();
    if (question.length < 2) { setNotice("Ask a more specific question."); return; }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setNotice("Supabase is not configured."); return; }
    setBusy(true); setNotice("");
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { setBusy(false); setNotice("Your session expired. Please sign in again."); return; }
    try {
      const response = await fetch("/api/analyst", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ workspaceId: workspace.id, question }) });
      const payload = await response.json() as AnalystResponse & { error?: string };
      if (!response.ok || payload.error) throw new Error(payload.error ?? "AI analysis could not be completed.");
      setAnswer(payload.answer); setEvidence(payload.evidence);
    } catch (error) { setNotice(error instanceof Error ? error.message : "AI analysis could not be completed."); }
    finally { setBusy(false); }
  };

  if (loadingWorkspace) return <section className="view-page"><article className="panel workspace-empty"><LoaderCircle className="spin" size={22} /><p>Checking your workspace access…</p></article></section>;
  if (!workspace) return <section className="view-page"><article className="panel workspace-empty"><Building2 size={22} /><h2>Sign in to use AI Analyst.</h2><p>PulseBoard analyses only the customer and deal records inside your own workspace.</p></article></section>;
  return <section className="analyst-page"><div className="analyst-hero"><div className="analyst-icon"><Bot size={24} /></div><p className="eyebrow"><Sparkles size={13} />Workspace intelligence</p><h1>Ask your business,<br />not another dashboard.</h1><p>Questions are analysed server-side against the selected workspace only. Nothing from another workspace is included.</p></div><div className="analyst-workspace"><article className="panel analyst-answer"><div className="analyst-answer-head"><span><Sparkles size={15} />AI Analyst</span><small>{answer ? "Evidence-aware response" : "Ready for a real question"}</small></div>{answer ? <p>{answer}</p> : <p>Ask a question about {workspace.name}. The Analyst will use real CRM records only after its server-side provider is activated.</p>}<div className="evidence-box"><b>{evidence ? "Evidence included in this answer" : "Available workspace evidence"}</b><span><HeartPulse size={14} /> {evidence?.customerCount ?? 0} customers</span><span><BarChart3 size={14} /> {evidence?.dealCount ?? 0} deals</span><span><Building2 size={14} /> {evidence?.contactCount ?? 0} contacts</span></div></article><div className="suggestions"><span>Try a suggested question</span>{["Which accounts need attention?", "Where is our pipeline concentrated?", "What data is missing for a better forecast?"].map((question) => <button key={question} onClick={() => setDraft(question)}>{question}<ArrowUpRight size={14} /></button>)}</div><form className="ai-composer" onSubmit={ask}><Sparkles size={19} /><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about this workspace…" disabled={busy} /><button aria-label="Ask AI" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <ArrowUpRight size={18} />}</button></form>{notice && <p className="analyst-notice">{notice}</p>}</div></section>;
}
