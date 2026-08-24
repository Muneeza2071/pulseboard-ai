"use client";

import {
  Bell,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  Command,
  FileBarChart,
  Github,
  LayoutDashboard,
  LineChart,
  Menu,
  MoreHorizontal,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { AuthControls, type WorkspaceRef } from "../components/AuthControls";
import { AnalystWorkspace } from "../components/AnalystWorkspace";
import { IntegrationsWorkspace } from "../components/IntegrationsWorkspace";
import { CustomersWorkspaceView, PipelineWorkspaceView, WorkspaceDashboard } from "../components/WorkspaceCRM";

type ViewKey = "dashboard" | "customers" | "pipeline" | "metrics" | "analyst" | "reports" | "settings";

const navItems: { label: string; key: ViewKey; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", key: "dashboard", icon: LayoutDashboard },
  { label: "Customers", key: "customers", icon: Users },
  { label: "Pipeline", key: "pipeline", icon: BriefcaseBusiness },
  { label: "Metrics", key: "metrics", icon: LineChart },
  { label: "AI Analyst", key: "analyst", icon: Bot },
  { label: "Reports", key: "reports", icon: FileBarChart },
];

function PulseMark({ compact = false }: { compact?: boolean }) {
  return <div className="brand-lockup" aria-label="PulseBoard AI"><span className="pulse-mark"><span /><span /><span /></span>{!compact && <span className="brand-word">pulse<span>board</span><b>AI</b></span>}</div>;
}

function Avatar({ initials, tone = "cyan" }: { initials: string; tone?: string }) {
  return <span className={`avatar avatar-${tone}`}>{initials}</span>;
}

function PendingView({ title, eyebrow, body, action }: { title: string; eyebrow: string; body: string; action: string }) {
  if (title === "AI Analyst") return <AnalystWorkspace />;
  return <section className="view-page"><div className="page-heading compact"><div><p className="eyebrow">{eyebrow}</p><h1>{title}<span>.</span></h1><p>{body}</p></div></div><article className="panel workspace-empty"><Sparkles size={23} /><h2>Connect real workspace records first.</h2><p>{action}</p></article></section>;
}

function SettingsView({ workspace, onToast }: { workspace: WorkspaceRef | null; onToast: (message: string) => void }) {
  return <section className="view-page"><div className="page-heading compact"><div><p className="eyebrow">Workspace controls</p><h1>Settings<span>.</span></h1><p>Manage real data boundaries and user-triggered manual connections.</p></div></div><div className="settings-grid"><article className="panel settings-card"><div className="settings-heading"><Users size={19} /><span><b>Workspace</b><small>{workspace ? `${workspace.name} · RLS protected` : "Sign in to select a workspace"}</small></span></div><button onClick={() => onToast(workspace ? "Workspace membership is enforced by Supabase RLS." : "Sign in before accessing workspace controls.")}>Membership and roles <ChevronRight size={16} /></button><button onClick={() => onToast("Workspace switching is planned after multi-workspace selection is added.")}>Workspace switching <span className="connection-status">Planned</span><ChevronRight size={16} /></button></article><article className="panel settings-card"><div className="settings-heading"><SlidersHorizontal size={19} /><span><b>Data controls</b><small>Explicit workspace boundaries</small></span></div><button onClick={() => onToast("AI Analyst sends only a selected workspace summary to the server-side provider.")}>AI data boundary <ChevronRight size={16} /></button><button onClick={() => onToast("Sync history below records only user-triggered actions.")}>Manual sync only <span className="connection-status">Enabled</span><ChevronRight size={16} /></button></article></div><div className="settings-integrations"><IntegrationsWorkspace /></div></section>;
}

export default function Home() {
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [authenticatedName, setAuthenticatedName] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceRef | null>(null);
  const activeLabel = navItems.find((item) => item.key === activeView)?.label ?? "Settings";
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3600); };
  const navigate = (key: ViewKey) => { setActiveView(key); setMobileMenuOpen(false); };
  const workspaceInitial = workspace?.name.slice(0, 1).toUpperCase() ?? "P";

  return <main className="app-shell"><aside className="sidebar" aria-label="Primary navigation"><div className="sidebar-top"><PulseMark /><button className="workspace-switcher" onClick={() => showToast(workspace ? `${workspace.name} is the active secure workspace.` : "Sign in to create your first secure workspace.")}><span className="workspace-logo">{workspaceInitial}</span><span><b>{workspace?.name ?? "Your workspace"}</b><small>{workspace ? "RLS-protected data" : "Sign in to activate"}</small></span><ChevronDown size={15} /></button><nav className="nav-list"><span className="nav-caption">Workspace</span>{navItems.map((item) => { const Icon = item.icon; return <button key={item.key} className={`nav-item ${activeView === item.key ? "active" : ""}`} onClick={() => navigate(item.key)}><Icon size={18} /><span>{item.label}</span>{item.key === "analyst" && <i className="nav-spark"><Sparkles size={12} /></i>}</button>; })}<span className="nav-caption nav-caption-lower">System</span><button className={`nav-item ${activeView === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><Settings2 size={18} /><span>Settings</span></button></nav></div><div className="sidebar-bottom"><button className="help-row" onClick={() => showToast("Use Customers and Pipeline to add real records before asking the AI Analyst.")}><Command size={16} /> Workspace guide <kbd>⌘ K</kbd></button><button className="profile-row" onClick={() => showToast(authenticatedName ? "Your signed-in session is active." : "Use the top-right Sign in button to access your workspace.")}><Avatar initials={authenticatedName ? authenticatedName.slice(0, 2).toUpperCase() : "PB"} tone="violet" /><span><b>{authenticatedName ?? "Guest preview"}</b><small>{authenticatedName ? "Authenticated member" : "No workspace data loaded"}</small></span><MoreHorizontal size={17} /></button></div></aside><section className="workspace-shell"><header className="topbar"><div className="mobile-brand"><PulseMark compact /><span>PulseBoard</span></div><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><b>{activeLabel}</b></div><div className="top-actions"><button className="icon-button search-button" aria-label="Search" onClick={() => showToast("Search will include real workspace records after global search is added.")}><Search size={18} /><span>Search</span><kbd>⌘ K</kbd></button><button className="icon-button" aria-label="Notifications" onClick={() => showToast("Notifications are not enabled yet.")}><Bell size={18} /></button><AuthControls onUserChange={setAuthenticatedName} onWorkspaceChange={setWorkspace} /><button className="mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)}><Menu size={21} /></button></div></header>{mobileMenuOpen && <div className="mobile-sheet-backdrop" onClick={() => setMobileMenuOpen(false)}><aside className="mobile-sheet" onClick={(event) => event.stopPropagation()}><div className="mobile-sheet-head"><PulseMark /><button onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation"><X size={20} /></button></div><div className="nav-list">{navItems.map((item) => { const Icon = item.icon; return <button key={item.key} className={`nav-item ${activeView === item.key ? "active" : ""}`} onClick={() => navigate(item.key)}><Icon size={18} /><span>{item.label}</span></button>; })}<button className={`nav-item ${activeView === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><Settings2 size={18} /><span>Settings</span></button></div><div className="profile-row mobile-profile"><Avatar initials={authenticatedName ? authenticatedName.slice(0, 2).toUpperCase() : "PB"} tone="violet" /><span><b>{authenticatedName ?? "Guest preview"}</b><small>{workspace ? workspace.name : "No workspace selected"}</small></span></div></aside></div>}<div className="page-wrap"><div className="foundation-banner"><Sparkles size={15} /><span><b>Real data mode</b> — dashboard numbers come only from your authenticated workspace. Empty workspaces stay empty by design.</span><button onClick={() => showToast("Every CRM query uses the pulseboard_* workspace RLS boundary.")}>Security plan <ChevronRight size={14} /></button></div>{activeView === "dashboard" && <WorkspaceDashboard workspace={workspace} onNavigate={navigate} onToast={showToast} />}{activeView === "customers" && <CustomersWorkspaceView workspace={workspace} onToast={showToast} />}{activeView === "pipeline" && <PipelineWorkspaceView workspace={workspace} onToast={showToast} />}{activeView === "metrics" && <PendingView title="Metrics" eyebrow="Metric library" body="Trusted metric definitions and snapshots will appear here once you add data sources." action="Use CRM records now; manual integrations will be the next source of trusted metric snapshots." />}{activeView === "analyst" && <PendingView title="AI Analyst" eyebrow="Workspace intelligence" body="AI analysis will be added only after a server-side provider key and a strict workspace summary boundary are configured." action="No provider secret will be shipped to the browser, and it will never analyse another workspace’s data." />}{activeView === "reports" && <PendingView title="Reports" eyebrow="Shareable intelligence" body="Reports will use real workspace data rather than generated sample figures." action="Add customer and deal records first; report generation is the next data-backed step." />}{activeView === "settings" && <SettingsView workspace={workspace} onToast={showToast} />}</div><nav className="bottom-nav" aria-label="Mobile navigation">{[{ key: "dashboard" as ViewKey, label: "Home", icon: LayoutDashboard }, { key: "customers" as ViewKey, label: "Customers", icon: Users }, { key: "analyst" as ViewKey, label: "AI", icon: Bot }, { key: "settings" as ViewKey, label: "Settings", icon: Settings2 }].map((item) => { const Icon = item.icon; return <button key={item.key} className={activeView === item.key ? "active" : ""} onClick={() => navigate(item.key)}><Icon size={19} /><span>{item.label}</span></button>; })}<button onClick={() => setMobileMenuOpen(true)}><MoreHorizontal size={20} /><span>More</span></button></nav></section>{toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}</main>;
}
