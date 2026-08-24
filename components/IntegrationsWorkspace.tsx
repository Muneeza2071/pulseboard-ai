"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Github, Link2, LoaderCircle, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type Provider = "github" | "hubspot";
type Workspace = { id: string; name: string };
type Integration = { id: string; provider: Provider; status: "pending" | "connected" | "error" | "disconnected"; account_label: string | null; last_synced_at: string | null; last_error: string | null };
type Repository = { id: string; integration_id: string; full_name: string; default_branch: string | null; selected: boolean };
type SyncRun = { id: string; provider: Provider; status: "running" | "succeeded" | "failed"; started_at: string; records_seen: number; records_written: number; error_message: string | null };

const time = (value: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not synced yet";

export function IntegrationsWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<Provider | "repositories" | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setLoading(false); return; }
    const { data: nextWorkspace } = await supabase.from("pulseboard_workspaces").select("id, name").limit(1).maybeSingle();
    setWorkspace(nextWorkspace ?? null);
    if (!nextWorkspace) { setIntegrations([]); setRepositories([]); setRuns([]); setLoading(false); return; }
    const [integrationResult, repositoryResult, runResult] = await Promise.all([
      supabase.from("pulseboard_integrations").select("id, provider, status, account_label, last_synced_at, last_error").eq("workspace_id", nextWorkspace.id),
      supabase.from("pulseboard_integration_repositories").select("id, integration_id, full_name, default_branch, selected").eq("workspace_id", nextWorkspace.id).order("full_name"),
      supabase.from("pulseboard_sync_runs").select("id, provider, status, started_at, records_seen, records_written, error_message").eq("workspace_id", nextWorkspace.id).order("started_at", { ascending: false }).limit(6),
    ]);
    setIntegrations((integrationResult.data ?? []) as Integration[]);
    setRepositories((repositoryResult.data ?? []) as Repository[]);
    setRuns((runResult.data ?? []) as SyncRun[]);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function request(provider: Provider, action: "start" | "sync" | "disconnect") {
    if (!workspace) return setNotice("Sign in and create a workspace before managing integrations.");
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase!.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return setNotice("Your session expired. Please sign in again.");
    setBusy(provider); setNotice("");
    try {
      const endpoint = action === "disconnect" ? "/api/integrations/disconnect" : `/api/integrations/${provider}/${action}`;
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(action === "disconnect" ? { workspaceId: workspace.id, provider } : { workspaceId: workspace.id }) });
      const payload = await response.json() as { url?: string; error?: string; repositories?: Array<unknown>; companies?: number; contacts?: number; deals?: number };
      if (!response.ok || payload.error) throw new Error(payload.error ?? "Integration request failed.");
      if (action === "start" && payload.url) { window.location.assign(payload.url); return; }
      if (action === "sync") {
        if (provider === "github") setNotice(`GitHub manual sync completed: ${payload.repositories?.length ?? 0} repositories found.`);
        else setNotice(`HubSpot manual sync completed: ${payload.companies ?? 0} companies, ${payload.contacts ?? 0} contacts, ${payload.deals ?? 0} deals.`);
      }
      if (action === "disconnect") setNotice(`${provider === "github" ? "GitHub" : "HubSpot"} was disconnected and the stored credential was removed.`);
      await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Integration request failed."); }
    finally { setBusy(null); }
  }

  async function toggleRepository(repository: Repository) {
    if (!workspace) return;
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase!.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return setNotice("Your session expired. Please sign in again.");
    setBusy("repositories"); setNotice("");
    try {
      const response = await fetch("/api/integrations/repositories/select", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ workspaceId: workspace.id, repositoryId: repository.id, selected: !repository.selected }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok || payload.error) throw new Error(payload.error ?? "Repository selection failed.");
      setNotice(`${repository.full_name} ${repository.selected ? "removed" : "selected"} for future product-signal analysis.`);
      await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Repository selection failed."); }
    finally { setBusy(null); }
  }

  const integrationFor = (provider: Provider) => integrations.find((integration) => integration.provider === provider);
  const card = (provider: Provider, title: string, icon: React.ReactNode, description: string) => {
    const integration = integrationFor(provider); const connected = integration?.status === "connected";
    return <article className="panel integration-card"><div className="integration-card-head"><span>{icon}</span><div><b>{title}</b><small>{connected ? integration.account_label ?? "Connected" : "Not connected"}</small></div><i className={connected ? "connected" : ""}>{connected ? "Connected" : "Setup needed"}</i></div><p>{description}</p>{integration?.last_error && <p className="integration-error">{integration.last_error}</p>}<small className="sync-time">{connected ? `Last manual sync: ${time(integration.last_synced_at)}` : "No credential is stored until you authorise this provider."}</small><div className="integration-actions">{!connected ? <button className="primary-button" onClick={() => void request(provider, "start")} disabled={busy !== null}>{busy === provider ? <LoaderCircle className="spin" size={16} /> : <Link2 size={16} />}Connect {title}</button> : <><button className="secondary-button" onClick={() => void request(provider, "sync")} disabled={busy !== null}>{busy === provider ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}Sync now</button><button className="icon-inline integration-disconnect" aria-label={`Disconnect ${title}`} onClick={() => void request(provider, "disconnect")} disabled={busy !== null}><Unplug size={17} /></button></>}</div></article>;
  };

  if (loading) return <article className="panel workspace-empty"><LoaderCircle className="spin" size={22} /><p>Loading workspace integration state…</p></article>;
  if (!workspace) return <article className="panel workspace-empty"><ShieldCheck size={22} /><h2>Sign in to manage integrations.</h2><p>Connections and sync runs are limited to the workspace you belong to.</p></article>;
  return <div className="integration-workspace"><div className="integration-grid">{card("github", "GitHub", <Github size={20} />, "Connect a GitHub account, choose repositories, then run sync only when you press Sync now.")}{card("hubspot", "HubSpot", <CheckCircle2 size={20} />, "Connect HubSpot through OAuth and manually sync permitted company, contact, and deal records.")}</div>{repositories.length > 0 && <article className="panel repository-panel"><div className="panel-head"><div><span className="section-label">GitHub source selection</span><h2>Repositories</h2><p>Choose which synced repositories may contribute product signals later.</p></div></div><div className="repository-list">{repositories.map((repository) => <label key={repository.id} className="repository-row"><input type="checkbox" checked={repository.selected} disabled={busy !== null} onChange={() => void toggleRepository(repository)} /><span><b>{repository.full_name}</b><small>{repository.default_branch ? `Default branch: ${repository.default_branch}` : "No default branch returned"}</small></span></label>)}</div></article>}{runs.length > 0 && <article className="panel sync-history"><div className="panel-head"><div><span className="section-label">Manual activity</span><h2>Recent sync runs</h2></div></div>{runs.map((run) => <div className="sync-row" key={run.id}><span className={run.status === "succeeded" ? "sync-success" : run.status === "failed" ? "sync-failed" : "sync-running"}>{run.status}</span><b>{run.provider === "github" ? "GitHub" : "HubSpot"}</b><small>{run.records_written}/{run.records_seen} records · {time(run.started_at)}</small></div>)}</article>}{notice && <p className="integration-notice">{notice}</p>}</div>;
}
