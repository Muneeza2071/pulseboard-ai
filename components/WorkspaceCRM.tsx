"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CircleDollarSign,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import type { WorkspaceRef } from "./AuthControls";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

export type Customer = {
  id: string;
  workspace_id: string;
  name: string;
  segment: "startup" | "growth" | "scale" | "enterprise" | null;
  lifecycle_stage: "lead" | "onboarding" | "active" | "expansion" | "churned";
  health_status: "healthy" | "watch" | "at_risk";
  health_score: number;
  annual_value_cents: number;
  updated_at: string;
};

export type Deal = {
  id: string;
  workspace_id: string;
  customer_id: string | null;
  name: string;
  stage: "qualified" | "proposal" | "negotiation" | "won" | "lost";
  value_cents: number;
  probability: number;
  expected_close_date: string | null;
};

export type Contact = {
  id: string;
  workspace_id: string;
  customer_id: string | null;
  full_name: string;
  email: string | null;
  job_title: string | null;
  is_primary: boolean;
};

type CustomerDraft = Pick<Customer, "name" | "segment" | "lifecycle_stage" | "health_status" | "health_score" | "annual_value_cents">;
type ContactDraft = Pick<Contact, "customer_id" | "full_name" | "email" | "job_title" | "is_primary">;
type DealDraft = Pick<Deal, "customer_id" | "name" | "stage" | "value_cents" | "probability" | "expected_close_date">;

const blankCustomer: CustomerDraft = { name: "", segment: "growth", lifecycle_stage: "lead", health_status: "watch", health_score: 50, annual_value_cents: 0 };
const blankContact: ContactDraft = { customer_id: null, full_name: "", email: "", job_title: "", is_primary: false };
const blankDeal: DealDraft = { customer_id: null, name: "", stage: "qualified", value_cents: 0, probability: 30, expected_close_date: null };
const stages: Deal["stage"][] = ["qualified", "proposal", "negotiation", "won", "lost"];

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money = (cents: number) => currency.format(cents / 100);
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

function useWorkspaceCrm(workspace: WorkspaceRef | null) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!workspace || !supabase) {
      setCustomers([]);
      setContacts([]);
      setDeals([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const [customerResult, contactResult, dealResult] = await Promise.all([
      supabase.from("pulseboard_customers").select("id, workspace_id, name, segment, lifecycle_stage, health_status, health_score, annual_value_cents, updated_at").eq("workspace_id", workspace.id).order("updated_at", { ascending: false }),
      supabase.from("pulseboard_contacts").select("id, workspace_id, customer_id, full_name, email, job_title, is_primary").eq("workspace_id", workspace.id).order("full_name"),
      supabase.from("pulseboard_deals").select("id, workspace_id, customer_id, name, stage, value_cents, probability, expected_close_date").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
    ]);
    const firstError = customerResult.error ?? contactResult.error ?? dealResult.error;
    if (firstError) setError(firstError.message);
    else {
      setCustomers((customerResult.data ?? []) as Customer[]);
      setContacts((contactResult.data ?? []) as Contact[]);
      setDeals((dealResult.data ?? []) as Deal[]);
    }
    setLoading(false);
  }, [workspace]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { customers, contacts, deals, loading, error, refresh };
}

function RestrictedState({ title = "Sign in to view your workspace data." }: { title?: string }) {
  return <article className="panel workspace-empty"><Building2 size={22} /><h2>{title}</h2><p>PulseBoard never shows another workspace’s CRM records. Sign in, then create or select your own workspace.</p></article>;
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="workspace-empty compact-empty"><Building2 size={20} /><h3>{title}</h3><p>{body}</p>{action}</div>;
}

function CustomerForm({ initial, onCancel, onSave, busy }: { initial: CustomerDraft; onCancel: () => void; onSave: (draft: CustomerDraft) => Promise<void>; busy: boolean }) {
  const [draft, setDraft] = useState<CustomerDraft>(initial);
  const [notice, setNotice] = useState("");
  const update = <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (draft.name.trim().length < 1) return setNotice("Customer name is required.");
    setNotice("");
    await onSave({ ...draft, name: draft.name.trim() });
  };
  return <form className="crm-form" onSubmit={submit}>
    <label><span>Customer name</span><input value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Northstar Labs" autoFocus required /></label>
    <div className="form-grid">
      <label><span>Segment</span><select value={draft.segment ?? ""} onChange={(event) => update("segment", (event.target.value || null) as CustomerDraft["segment"])}><option value="">Not set</option>{["startup", "growth", "scale", "enterprise"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label><span>Lifecycle</span><select value={draft.lifecycle_stage} onChange={(event) => update("lifecycle_stage", event.target.value as CustomerDraft["lifecycle_stage"])}>{["lead", "onboarding", "active", "expansion", "churned"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label><span>Health</span><select value={draft.health_status} onChange={(event) => update("health_status", event.target.value as CustomerDraft["health_status"])}>{["healthy", "watch", "at_risk"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label><span>Health score</span><input type="number" min="0" max="100" value={draft.health_score} onChange={(event) => update("health_score", Number(event.target.value))} required /></label>
      <label><span>Annual value (USD)</span><input type="number" min="0" step="1" value={Math.round(draft.annual_value_cents / 100)} onChange={(event) => update("annual_value_cents", Math.max(0, Number(event.target.value) * 100))} required /></label>
    </div>
    {notice && <p className="form-notice">{notice}</p>}
    <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className="primary-button" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Building2 size={16} />}{initial.name ? "Save changes" : "Create customer"}</button></div>
  </form>;
}

function ContactForm({ customers, initial, onCancel, onSave, busy }: { customers: Customer[]; initial: ContactDraft; onCancel: () => void; onSave: (draft: ContactDraft) => Promise<void>; busy: boolean }) {
  const [draft, setDraft] = useState<ContactDraft>(initial);
  const [notice, setNotice] = useState("");
  const update = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!draft.full_name.trim()) return setNotice("Contact name is required."); setNotice(""); await onSave({ ...draft, full_name: draft.full_name.trim(), email: draft.email?.trim() || null, job_title: draft.job_title?.trim() || null }); };
  return <form className="crm-form" onSubmit={submit}>
    <label><span>Contact name</span><input value={draft.full_name} onChange={(event) => update("full_name", event.target.value)} placeholder="Mira Kim" autoFocus required /></label>
    <div className="form-grid">
      <label><span>Customer</span><select value={draft.customer_id ?? ""} onChange={(event) => update("customer_id", event.target.value || null)}><option value="">Unassigned</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label><span>Email</span><input type="email" value={draft.email ?? ""} onChange={(event) => update("email", event.target.value)} placeholder="mira@northstar.com" /></label>
      <label><span>Role</span><input value={draft.job_title ?? ""} onChange={(event) => update("job_title", event.target.value)} placeholder="Head of Growth" /></label>
    </div>
    <label className="check-row"><input type="checkbox" checked={draft.is_primary} onChange={(event) => update("is_primary", event.target.checked)} /> Primary contact</label>
    {notice && <p className="form-notice">{notice}</p>}
    <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className="primary-button" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <UserRoundPlus size={16} />}{initial.full_name ? "Save contact" : "Create contact"}</button></div>
  </form>;
}

function DealForm({ customers, initial, onCancel, onSave, busy }: { customers: Customer[]; initial: DealDraft; onCancel: () => void; onSave: (draft: DealDraft) => Promise<void>; busy: boolean }) {
  const [draft, setDraft] = useState<DealDraft>(initial);
  const [notice, setNotice] = useState("");
  const update = <K extends keyof DealDraft>(key: K, value: DealDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!draft.name.trim()) return setNotice("Deal name is required."); setNotice(""); await onSave({ ...draft, name: draft.name.trim() }); };
  return <form className="crm-form" onSubmit={submit}>
    <label><span>Deal name</span><input value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Northstar expansion" autoFocus required /></label>
    <div className="form-grid">
      <label><span>Customer</span><select value={draft.customer_id ?? ""} onChange={(event) => update("customer_id", event.target.value || null)}><option value="">Unassigned</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label><span>Stage</span><select value={draft.stage} onChange={(event) => update("stage", event.target.value as DealDraft["stage"])}>{stages.map((stage) => <option key={stage} value={stage}>{label(stage)}</option>)}</select></label>
      <label><span>Value (USD)</span><input type="number" min="0" step="1" value={Math.round(draft.value_cents / 100)} onChange={(event) => update("value_cents", Math.max(0, Number(event.target.value) * 100))} required /></label>
      <label><span>Probability (%)</span><input type="number" min="0" max="100" value={draft.probability} onChange={(event) => update("probability", Math.max(0, Math.min(100, Number(event.target.value))))} required /></label>
      <label><span>Expected close</span><input type="date" value={draft.expected_close_date ?? ""} onChange={(event) => update("expected_close_date", event.target.value || null)} /></label>
    </div>
    {notice && <p className="form-notice">{notice}</p>}
    <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className="primary-button" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <CircleDollarSign size={16} />}{initial.name ? "Save deal" : "Create deal"}</button></div>
  </form>;
}

function Dialog({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="auth-backdrop" onClick={onClose}><section className="auth-dialog crm-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}><button className="auth-close" onClick={onClose} aria-label="Close"><X size={18} /></button><div className="auth-brand"><span><Building2 size={19} /></span><p>Real workspace data</p></div><h2>{title}</h2><p className="auth-description">{subtitle}</p>{children}</section></div>;
}

export function WorkspaceDashboard({ workspace, onNavigate, onToast }: { workspace: WorkspaceRef | null; onNavigate: (view: "customers" | "pipeline" | "analyst") => void; onToast: (message: string) => void }) {
  const { customers, deals, contacts, loading, error, refresh } = useWorkspaceCrm(workspace);
  const openDeals = deals.filter((deal) => !["won", "lost"].includes(deal.stage));
  const atRisk = customers.filter((customer) => customer.health_status === "at_risk");
  const activeCustomers = customers.filter((customer) => customer.lifecycle_stage === "active");
  const pipeline = openDeals.reduce((sum, deal) => sum + deal.value_cents, 0);
  if (!workspace) return <RestrictedState />;
  const kpis = [
    { label: "Annual customer value", value: money(customers.reduce((sum, customer) => sum + customer.annual_value_cents, 0)), tone: "cyan", icon: CircleDollarSign, detail: `${customers.length} customer${customers.length === 1 ? "" : "s"}` },
    { label: "Active customers", value: String(activeCustomers.length), tone: "violet", icon: Users, detail: `${customers.length} total accounts` },
    { label: "Open pipeline", value: money(pipeline), tone: "amber", icon: Building2, detail: `${openDeals.length} active deal${openDeals.length === 1 ? "" : "s"}` },
    { label: "At-risk accounts", value: String(atRisk.length).padStart(2, "0"), tone: "rose", icon: CircleDollarSign, detail: atRisk.length ? "Needs attention" : "No accounts flagged" },
  ];
  return <>
    <section className="page-heading"><div><p className="eyebrow"><span className="live-dot" />{workspace.name}</p><h1>Your real workspace<span>.</span></h1><p>Only records belonging to this workspace are loaded.</p></div><div className="heading-actions"><button className="secondary-button" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={16} /> Refresh</button><button className="primary-button" onClick={() => onNavigate("customers")}><Plus size={17} /> Add customer</button></div></section>
    {error && <p className="inline-error">Could not load CRM data: {error}</p>}
    <section className="kpi-grid">{kpis.map((kpi) => { const Icon = kpi.icon; return <article className="kpi-card" key={kpi.label}><div className={`kpi-icon ${kpi.tone}`}><Icon size={19} /></div><span>{kpi.label}</span><strong>{loading ? "—" : kpi.value}</strong><small>{kpi.detail}</small></article>; })}</section>
    <section className="lower-grid"><article className="panel customer-panel"><div className="panel-head"><div><span className="section-label">Customer health</span><h2>Accounts needing attention</h2></div><button className="text-action" onClick={() => onNavigate("customers")}>Manage customers</button></div>{customers.length ? <div className="customer-stack">{[...customers].sort((a, b) => a.health_score - b.health_score).slice(0, 4).map((customer) => <button className="customer-row" key={customer.id} onClick={() => onNavigate("customers")}><span className="avatar avatar-cyan">{initials(customer.name)}</span><span className="customer-name"><b>{customer.name}</b><small>{customer.segment ? label(customer.segment) : "Unsegmented"} · {label(customer.lifecycle_stage)}</small></span><span className="health-track"><i><em style={{ width: `${customer.health_score}%` }} /></i><small>{customer.health_score}/100</small></span><span className={`health-badge ${customer.health_status.replace("_", "-")}`}>{label(customer.health_status)}</span></button>)}</div> : <EmptyState title="No customer records yet" body="Create your first customer to replace the illustrative dashboard figures with real workspace data." action={<button className="text-action" onClick={() => onNavigate("customers")}>Create customer</button>} />}</article>
    <article className="panel activity-panel"><div className="panel-head"><div><span className="section-label">Live CRM signals</span><h2>Workspace snapshot</h2></div></div><div className="activity-list"><div className="activity-item"><span className="activity-icon cyan"><Users size={15} /></span><span><b>{contacts.length} contact{contacts.length === 1 ? "" : "s"}</b><small>Saved in this workspace</small></span></div><div className="activity-item"><span className="activity-icon violet"><Building2 size={15} /></span><span><b>{deals.length} deal{deals.length === 1 ? "" : "s"}</b><small>Pipeline data ready for analysis</small></span></div><div className="activity-item"><span className="activity-icon amber"><CircleDollarSign size={15} /></span><span><b>Manual sync mode</b><small>GitHub and HubSpot will sync only when you choose.</small></span></div></div><button className="text-action" onClick={() => onToast("AI Analyst will analyse only the CRM data inside your selected workspace.")}>Open AI Analyst</button></article></section>
  </>;
}

export function CustomersWorkspaceView({ workspace, onToast }: { workspace: WorkspaceRef | null; onToast: (message: string) => void }) {
  const { customers, contacts, loading, error, refresh } = useWorkspaceCrm(workspace);
  const [search, setSearch] = useState("");
  const [customerDialog, setCustomerDialog] = useState<Customer | "new" | null>(null);
  const [contactDialog, setContactDialog] = useState<Contact | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const visibleCustomers = useMemo(() => customers.filter((customer) => customer.name.toLowerCase().includes(search.toLowerCase())), [customers, search]);
  if (!workspace) return <RestrictedState title="Sign in to manage customers and contacts." />;
  const supabase = getSupabaseBrowserClient();
  const saveCustomer = async (draft: CustomerDraft) => {
    if (!supabase) return;
    setBusy(true);
    const editing = customerDialog !== "new" ? customerDialog : null;
    const payload = { ...draft, workspace_id: workspace.id };
    const result = editing ? await supabase.from("pulseboard_customers").update(payload).eq("id", editing.id).eq("workspace_id", workspace.id) : await supabase.from("pulseboard_customers").insert(payload);
    setBusy(false);
    if (result.error) return onToast(result.error.message);
    setCustomerDialog(null); onToast(editing ? "Customer updated." : "Customer created."); void refresh();
  };
  const saveContact = async (draft: ContactDraft) => {
    if (!supabase) return;
    setBusy(true);
    const editing = contactDialog !== "new" ? contactDialog : null;
    const payload = { ...draft, workspace_id: workspace.id };
    const result = editing ? await supabase.from("pulseboard_contacts").update(payload).eq("id", editing.id).eq("workspace_id", workspace.id) : await supabase.from("pulseboard_contacts").insert(payload);
    setBusy(false);
    if (result.error) return onToast(result.error.message);
    setContactDialog(null); onToast(editing ? "Contact updated." : "Contact created."); void refresh();
  };
  const remove = async (table: "pulseboard_customers" | "pulseboard_contacts", id: string, labelText: string) => {
    if (!supabase || !window.confirm(`Delete ${labelText}? This cannot be undone.`)) return;
    const { error: deleteError } = await supabase.from(table).delete().eq("id", id).eq("workspace_id", workspace.id);
    if (deleteError) return onToast(deleteError.message);
    onToast(`${labelText} deleted.`); void refresh();
  };
  return <section className="view-page"><div className="page-heading compact"><div><p className="eyebrow">Customer intelligence</p><h1>Customers<span>.</span></h1><p>Manage real customer and contact records inside {workspace.name}.</p></div><div className="heading-actions"><button className="secondary-button" onClick={() => void refresh()}><RefreshCw className={loading ? "spin" : ""} size={16} /> Refresh</button><button className="primary-button" onClick={() => setCustomerDialog("new")}><Plus size={17} /> Add customer</button></div></div>{error && <p className="inline-error">{error}</p>}<article className="panel table-panel"><div className="table-tools"><label className="search-field"><Users size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers" /></label></div>{visibleCustomers.length ? <div className="data-table"><div className="table-head"><span>Customer</span><span>Lifecycle</span><span>Health</span><span>Annual value</span><span /></div>{visibleCustomers.map((customer) => <div className="table-row" key={customer.id}><span className="table-customer"><span className="avatar avatar-cyan">{initials(customer.name)}</span><span><b>{customer.name}</b><small>{customer.segment ? label(customer.segment) : "Unsegmented"}</small></span></span><span>{label(customer.lifecycle_stage)}</span><span><i className={`health-badge ${customer.health_status.replace("_", "-")}`}>{customer.health_score}/100</i></span><strong>{money(customer.annual_value_cents)}</strong><span className="row-actions"><button className="row-menu" onClick={() => setCustomerDialog(customer)} aria-label={`Edit ${customer.name}`}><Edit3 size={16} /></button><button className="row-menu danger" onClick={() => void remove("pulseboard_customers", customer.id, customer.name)} aria-label={`Delete ${customer.name}`}><Trash2 size={16} /></button></span></div>)}</div> : <EmptyState title="No real customers yet" body="This workspace starts empty by design. Add a customer instead of relying on sample records." action={<button className="primary-button" onClick={() => setCustomerDialog("new")}><Plus size={16} /> Add customer</button>} />}</article><article className="panel contacts-panel"><div className="panel-head"><div><span className="section-label">Relationships</span><h2>Contacts</h2></div><button className="secondary-button" onClick={() => setContactDialog("new")}><UserRoundPlus size={16} /> Add contact</button></div>{contacts.length ? <div className="contact-list">{contacts.map((contact) => <div className="contact-row" key={contact.id}><span className="avatar avatar-violet">{initials(contact.full_name)}</span><span><b>{contact.full_name}{contact.is_primary && <em>Primary</em>}</b><small>{contact.job_title || "No role"}{contact.email ? ` · ${contact.email}` : ""}</small></span><small>{customers.find((customer) => customer.id === contact.customer_id)?.name ?? "Unassigned"}</small><span className="row-actions"><button className="row-menu" onClick={() => setContactDialog(contact)} aria-label={`Edit ${contact.full_name}`}><Edit3 size={16} /></button><button className="row-menu danger" onClick={() => void remove("pulseboard_contacts", contact.id, contact.full_name)} aria-label={`Delete ${contact.full_name}`}><Trash2 size={16} /></button></span></div>)}</div> : <EmptyState title="No contacts saved" body="Add the people behind your customer accounts to make customer intelligence actionable." action={<button className="text-action" onClick={() => setContactDialog("new")}>Add contact</button>} />}</article>{customerDialog && <Dialog title={customerDialog === "new" ? "Create customer" : `Edit ${customerDialog.name}`} subtitle="This record is visible only to members of this workspace." onClose={() => !busy && setCustomerDialog(null)}><CustomerForm initial={customerDialog === "new" ? blankCustomer : customerDialog} onCancel={() => setCustomerDialog(null)} onSave={saveCustomer} busy={busy} /></Dialog>}{contactDialog && <Dialog title={contactDialog === "new" ? "Create contact" : `Edit ${contactDialog.full_name}`} subtitle="Contacts are protected by the same workspace RLS boundary." onClose={() => !busy && setContactDialog(null)}><ContactForm customers={customers} initial={contactDialog === "new" ? blankContact : contactDialog} onCancel={() => setContactDialog(null)} onSave={saveContact} busy={busy} /></Dialog>}</section>;
}

export function PipelineWorkspaceView({ workspace, onToast }: { workspace: WorkspaceRef | null; onToast: (message: string) => void }) {
  const { customers, deals, loading, error, refresh } = useWorkspaceCrm(workspace);
  const [dialog, setDialog] = useState<Deal | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  if (!workspace) return <RestrictedState title="Sign in to manage your real pipeline." />;
  const supabase = getSupabaseBrowserClient();
  const saveDeal = async (draft: DealDraft) => {
    if (!supabase) return;
    setBusy(true);
    const editing = dialog !== "new" ? dialog : null;
    const payload = { ...draft, workspace_id: workspace.id };
    const result = editing ? await supabase.from("pulseboard_deals").update(payload).eq("id", editing.id).eq("workspace_id", workspace.id) : await supabase.from("pulseboard_deals").insert(payload);
    setBusy(false);
    if (result.error) return onToast(result.error.message);
    setDialog(null); onToast(editing ? "Deal updated." : "Deal created."); void refresh();
  };
  const moveDeal = async (deal: Deal, stage: Deal["stage"]) => { if (!supabase) return; const { error: updateError } = await supabase.from("pulseboard_deals").update({ stage }).eq("id", deal.id).eq("workspace_id", workspace.id); if (updateError) return onToast(updateError.message); onToast(`${deal.name} moved to ${label(stage)}.`); void refresh(); };
  const deleteDeal = async (deal: Deal) => { if (!supabase || !window.confirm(`Delete ${deal.name}? This cannot be undone.`)) return; const { error: deleteError } = await supabase.from("pulseboard_deals").delete().eq("id", deal.id).eq("workspace_id", workspace.id); if (deleteError) return onToast(deleteError.message); onToast("Deal deleted."); void refresh(); };
  const weighted = deals.filter((deal) => !["won", "lost"].includes(deal.stage)).reduce((sum, deal) => sum + (deal.value_cents * deal.probability) / 100, 0);
  return <section className="view-page"><div className="page-heading compact"><div><p className="eyebrow">Revenue operations</p><h1>Pipeline<span>.</span></h1><p>Move real deals through your workspace forecast.</p></div><div className="heading-actions"><button className="secondary-button" onClick={() => void refresh()}><RefreshCw className={loading ? "spin" : ""} size={16} /> Refresh</button><button className="primary-button" onClick={() => setDialog("new")}><Plus size={17} /> New deal</button></div></div>{error && <p className="inline-error">{error}</p>}<div className="pipeline-stats"><span><b>{money(weighted)}</b> weighted forecast</span><span><b>{deals.filter((deal) => !["won", "lost"].includes(deal.stage)).length}</b> active deals</span><span><b>{deals.length}</b> total records</span></div><div className="pipeline-board">{stages.map((stage, index) => { const stageDeals = deals.filter((deal) => deal.stage === stage); return <article className="pipeline-column" key={stage}><div><span className={`stage-dot stage-${Math.min(index, 3)}`} /><b>{label(stage)}</b><small>{money(stageDeals.reduce((sum, deal) => sum + deal.value_cents, 0))}</small></div>{stageDeals.map((deal) => <section className="deal-card" key={deal.id}><span className="deal-avatar">{deal.name.slice(0, 1).toUpperCase()}</span><b>{deal.name}</b><small>{customers.find((customer) => customer.id === deal.customer_id)?.name ?? "Unassigned customer"}</small><i>{money(deal.value_cents)}</i><div className="deal-controls"><select value={deal.stage} onChange={(event) => void moveDeal(deal, event.target.value as Deal["stage"])} aria-label={`Move ${deal.name}`}>{stages.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><button onClick={() => setDialog(deal)} aria-label={`Edit ${deal.name}`}><Edit3 size={14} /></button><button className="danger" onClick={() => void deleteDeal(deal)} aria-label={`Delete ${deal.name}`}><Trash2 size={14} /></button></div></section>)}<button className="add-deal" onClick={() => setDialog("new")}><Plus size={15} /> Add deal</button></article>; })}</div>{!deals.length && <EmptyState title="No pipeline data yet" body="Create your first deal to see an honest forecast for this workspace." action={<button className="primary-button" onClick={() => setDialog("new")}><Plus size={16} /> Create deal</button>} />}{dialog && <Dialog title={dialog === "new" ? "Create deal" : `Edit ${dialog.name}`} subtitle="Deal stages and values remain isolated to this workspace." onClose={() => !busy && setDialog(null)}><DealForm customers={customers} initial={dialog === "new" ? blankDeal : dialog} onCancel={() => setDialog(null)} onSave={saveDeal} busy={busy} /></Dialog>}</section>;
}
