"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeAlert,
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Command,
  Download,
  FileBarChart,
  Filter,
  Github,
  HeartPulse,
  LayoutDashboard,
  LineChart,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AuthControls } from "../components/AuthControls";

type ViewKey = "dashboard" | "customers" | "pipeline" | "metrics" | "analyst" | "reports" | "settings";

const navItems: { label: string; key: ViewKey; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", key: "dashboard", icon: LayoutDashboard },
  { label: "Customers", key: "customers", icon: Users },
  { label: "Pipeline", key: "pipeline", icon: BriefcaseBusiness },
  { label: "Metrics", key: "metrics", icon: LineChart },
  { label: "AI Analyst", key: "analyst", icon: Bot },
  { label: "Reports", key: "reports", icon: FileBarChart },
];

const customers = [
  { name: "Northstar Labs", type: "Scale", owner: "Mira Kim", health: "Healthy", score: 92, value: "$18,400", initials: "NL", tone: "cyan" },
  { name: "Cloudline", type: "Growth", owner: "Jon Bell", health: "Watch", score: 68, value: "$9,200", initials: "CL", tone: "violet" },
  { name: "Folks & Co.", type: "Startup", owner: "D. Larson", health: "At risk", score: 41, value: "$6,800", initials: "FC", tone: "rose" },
  { name: "Acme Systems", type: "Scale", owner: "Mira Kim", health: "Healthy", score: 88, value: "$14,300", initials: "AS", tone: "amber" },
  { name: "Brim Studio", type: "Growth", owner: "Jon Bell", health: "Watch", score: 63, value: "$5,600", initials: "BS", tone: "teal" },
];

const dealColumns = [
  { stage: "Qualified", total: "$14.2k", deals: ["Northstar expansion", "Brim Studio annual"] },
  { stage: "Proposal", total: "$18.6k", deals: ["Cloudline workspace", "Atlas renewal"] },
  { stage: "Negotiation", total: "$9.8k", deals: ["Folks & Co. upgrade"] },
  { stage: "Won", total: "$21.4k", deals: ["Acme Systems growth", "Sona Commerce"] },
];

const reportCards = [
  { title: "Weekly executive brief", detail: "Revenue, pipeline, health", when: "Updated today" },
  { title: "Customer risk review", detail: "At-risk accounts & actions", when: "Updated yesterday" },
  { title: "Engineering signal digest", detail: "GitHub activity summary", when: "Ready to connect" },
];

function PulseMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup" aria-label="PulseBoard AI">
      <span className="pulse-mark"><span /><span /><span /></span>
      {!compact && <span className="brand-word">pulse<span>board</span><b>AI</b></span>}
    </div>
  );
}

function Avatar({ initials, tone = "cyan" }: { initials: string; tone?: string }) {
  return <span className={`avatar avatar-${tone}`}>{initials}</span>;
}

export default function Home() {
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rangeIndex, setRangeIndex] = useState(0);
  const [toast, setToast] = useState("Frontend foundation · connect Supabase next");
  const [customerSearch, setCustomerSearch] = useState("");
  const [insightPrompt, setInsightPrompt] = useState("");
  const [insightAnswer, setInsightAnswer] = useState(
    "Revenue momentum is positive, but three accounts need attention because product usage and recent activity are lower than their usual baseline.",
  );
  const [authenticatedName, setAuthenticatedName] = useState<string | null>(null);
  const ranges = ["Last 30 days", "This quarter", "Year to date"];

  const filteredCustomers = useMemo(
    () => customers.filter((customer) => customer.name.toLowerCase().includes(customerSearch.toLowerCase())),
    [customerSearch],
  );

  const navigate = (key: ViewKey) => {
    setActiveView(key);
    setMobileMenuOpen(false);
  };

  const showFoundationNotice = (message = "Frontend foundation · connect Supabase next") => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  };

  const askInsight = (question: string) => {
    const nextQuestion = question.trim() || "What requires attention this week?";
    setInsightPrompt(nextQuestion);
    setInsightAnswer(
      `Preview answer for “${nextQuestion}”: connect your workspace metrics and customer activities to generate an evidence-based response here.`,
    );
    showFoundationNotice("AI preview updated · secure server route comes next");
  };

  const activeLabel = navItems.find((item) => item.key === activeView)?.label ?? "Settings";

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-top">
          <PulseMark />
          <button className="workspace-switcher" onClick={() => showFoundationNotice("Workspace switching will use Supabase memberships")}> 
            <span className="workspace-logo">A</span>
            <span><b>Arcfield</b><small>Demo workspace</small></span>
            <ChevronDown size={15} />
          </button>
          <nav className="nav-list">
            <span className="nav-caption">Workspace</span>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.key} className={`nav-item ${activeView === item.key ? "active" : ""}`} onClick={() => navigate(item.key)}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {item.key === "analyst" && <i className="nav-spark"><Sparkles size={12} /></i>}
                </button>
              );
            })}
            <span className="nav-caption nav-caption-lower">System</span>
            <button className={`nav-item ${activeView === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}>
              <Settings2 size={18} /><span>Settings</span>
            </button>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <button className="help-row" onClick={() => showFoundationNotice("Help center will be connected in the product phase")}><Command size={16} /> Command menu <kbd>⌘ K</kbd></button>
          <button className="profile-row" onClick={() => showFoundationNotice(authenticatedName ? "Your authenticated PulseBoard profile is active" : "Sign in from the top bar to create your secure workspace")}>
            <Avatar initials={authenticatedName ? authenticatedName.slice(0, 2).toUpperCase() : "AH"} tone="violet" />
            <span><b>{authenticatedName ?? "Abbas Hussain"}</b><small>{authenticatedName ? "Authenticated member" : "Workspace owner"}</small></span>
            <MoreHorizontal size={17} />
          </button>
        </div>
      </aside>

      <section className="workspace-shell">
        <header className="topbar">
          <div className="mobile-brand"><PulseMark compact /><span>PulseBoard</span></div>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><b>{activeLabel}</b></div>
          <div className="top-actions">
            <button className="icon-button search-button" aria-label="Search" onClick={() => showFoundationNotice("Global search is ready for Supabase data wiring")}><Search size={18} /><span>Search</span><kbd>⌘ K</kbd></button>
            <button className="icon-button" aria-label="Notifications" onClick={() => showFoundationNotice("Notifications will arrive after the realtime phase")}><Bell size={18} /><i /></button>
            <AuthControls onUserChange={setAuthenticatedName} />
            <button className="mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)}><Menu size={21} /></button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="mobile-sheet-backdrop" onClick={() => setMobileMenuOpen(false)}>
            <aside className="mobile-sheet" onClick={(event) => event.stopPropagation()}>
              <div className="mobile-sheet-head"><PulseMark /><button onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
              <div className="nav-list">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return <button key={item.key} className={`nav-item ${activeView === item.key ? "active" : ""}`} onClick={() => navigate(item.key)}><Icon size={18} /><span>{item.label}</span></button>;
                })}
                <button className={`nav-item ${activeView === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><Settings2 size={18} /><span>Settings</span></button>
              </div>
              <div className="profile-row mobile-profile"><Avatar initials={authenticatedName ? authenticatedName.slice(0, 2).toUpperCase() : "AH"} tone="violet" /><span><b>{authenticatedName ?? "Abbas Hussain"}</b><small>{authenticatedName ? "Authenticated member" : "Workspace owner"}</small></span></div>
            </aside>
          </div>
        )}

        <div className="page-wrap">
          <div className="foundation-banner"><Sparkles size={15} /> <span><b>Secure data foundation</b> — authentication and workspace RLS are ready. Dashboard figures remain illustrative until you create and connect live workspace records.</span><button onClick={() => showFoundationNotice("The pulseboard_* schema is isolated from DevDesk and protected by workspace RLS")}>Security plan <ChevronRight size={14} /></button></div>
          {activeView === "dashboard" && <Dashboard range={ranges[rangeIndex]} onRangeChange={() => setRangeIndex((rangeIndex + 1) % ranges.length)} onNavigate={navigate} onInsight={askInsight} onNotice={showFoundationNotice} insightAnswer={insightAnswer} />}
          {activeView === "customers" && <CustomersView search={customerSearch} onSearch={setCustomerSearch} items={filteredCustomers} onNotice={showFoundationNotice} />}
          {activeView === "pipeline" && <PipelineView onNotice={showFoundationNotice} />}
          {activeView === "metrics" && <MetricsView onNotice={showFoundationNotice} />}
          {activeView === "analyst" && <AnalystView prompt={insightPrompt} answer={insightAnswer} onAsk={askInsight} />}
          {activeView === "reports" && <ReportsView onNotice={showFoundationNotice} />}
          {activeView === "settings" && <SettingsView onNotice={showFoundationNotice} />}
        </div>

        <nav className="bottom-nav" aria-label="Mobile navigation">
          {[
            { key: "dashboard" as ViewKey, label: "Home", icon: LayoutDashboard },
            { key: "customers" as ViewKey, label: "Customers", icon: Users },
            { key: "analyst" as ViewKey, label: "AI", icon: Bot },
            { key: "reports" as ViewKey, label: "Reports", icon: FileBarChart },
          ].map((item) => {
            const Icon = item.icon;
            return <button key={item.key} className={activeView === item.key ? "active" : ""} onClick={() => navigate(item.key)}><Icon size={19} /><span>{item.label}</span></button>;
          })}
          <button onClick={() => setMobileMenuOpen(true)}><MoreHorizontal size={20} /><span>More</span></button>
        </nav>
      </section>

      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    </main>
  );
}

function Dashboard({ range, onRangeChange, onNavigate, onInsight, onNotice, insightAnswer }: {
  range: string;
  onRangeChange: () => void;
  onNavigate: (key: ViewKey) => void;
  onInsight: (question: string) => void;
  onNotice: (message?: string) => void;
  insightAnswer: string;
}) {
  const kpis = [
    { label: "Monthly revenue", value: "$48,240", delta: "+12.4%", up: true, icon: CircleDollarSign, tone: "cyan" },
    { label: "Active customers", value: "128", delta: "+8 this month", up: true, icon: Users, tone: "violet" },
    { label: "Open pipeline", value: "$72,600", delta: "18 deals", up: true, icon: BriefcaseBusiness, tone: "amber" },
    { label: "At-risk accounts", value: "03", delta: "Need attention", up: false, icon: BadgeAlert, tone: "rose" },
  ];

  return <>
    <section className="page-heading">
      <div><p className="eyebrow"><span className="live-dot" />Live workspace</p><h1>Good afternoon, Abbas<span>.</span></h1><p>Here’s how your customer pulse is looking today.</p></div>
      <div className="heading-actions"><button className="range-button" onClick={onRangeChange}><CalendarDays size={17} /> {range}<ChevronDown size={15} /></button><button className="primary-button" onClick={() => onNotice("Create flow will save workspace records after Supabase wiring")}><Plus size={17} /> Create</button></div>
    </section>

    <section className="kpi-grid">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return <article className="kpi-card" key={kpi.label}><div className={`kpi-icon ${kpi.tone}`}><Icon size={19} /></div><span>{kpi.label}</span><strong>{kpi.value}</strong><small className={kpi.up ? "positive" : "negative"}>{kpi.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{kpi.delta}</small></article>;
      })}
    </section>

    <section className="analytics-grid">
      <article className="panel revenue-panel">
        <div className="panel-head"><div><span className="section-label">Performance</span><h2>Revenue momentum</h2><p>Recurring revenue and projected growth</p></div><button className="more-button" onClick={() => onNavigate("metrics")}><BarChart3 size={17} /> View metrics</button></div>
        <div className="chart-summary"><strong>$48,240</strong><span className="positive"><ArrowUpRight size={14} />12.4%</span><small>vs. previous period</small></div>
        <div className="chart-wrap" aria-label="Illustrative revenue trend chart">
          <div className="chart-y"><span>$60k</span><span>$40k</span><span>$20k</span><span>$0</span></div>
          <svg className="revenue-chart" viewBox="0 0 760 230" preserveAspectRatio="none" role="img" aria-label="Revenue trend rises across the selected period">
            <defs><linearGradient id="fillCyan" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity=".32"/><stop offset="100%" stopColor="#22d3ee" stopOpacity="0"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <g className="grid-lines"><line x1="0" y1="18" x2="760" y2="18"/><line x1="0" y1="84" x2="760" y2="84"/><line x1="0" y1="150" x2="760" y2="150"/><line x1="0" y1="216" x2="760" y2="216"/></g>
            <path d="M0,187 C55,179 73,162 115,168 C161,175 185,120 228,137 C273,155 292,112 336,116 C380,120 399,78 448,93 C500,110 528,48 576,66 C625,86 645,32 692,45 C724,54 741,25 760,29 L760,230 L0,230 Z" fill="url(#fillCyan)"/>
            <path d="M0,187 C55,179 73,162 115,168 C161,175 185,120 228,137 C273,155 292,112 336,116 C380,120 399,78 448,93 C500,110 528,48 576,66 C625,86 645,32 692,45 C724,54 741,25 760,29" fill="none" stroke="#22d3ee" strokeWidth="3" filter="url(#glow)"/>
            <circle cx="692" cy="45" r="5" fill="#07111f" stroke="#fff" strokeWidth="2"/><circle cx="692" cy="45" r="10" fill="#22d3ee" opacity=".18"/>
          </svg>
          <div className="chart-x"><span>May 01</span><span>May 08</span><span>May 15</span><span>May 22</span><span>May 29</span></div>
        </div>
      </article>
      <article className="panel insight-panel">
        <div className="ai-orb"><span /><i /><b><Sparkles size={16} /></b></div>
        <span className="section-label violet-label"><Sparkles size={13} />Pulse insight</span>
        <h2>Focus on customer signals, not noise.</h2>
        <p>{insightAnswer}</p>
        <div className="evidence-pills"><span><HeartPulse size={13} />Usage −18%</span><span><Activity size={13} />3 quiet accounts</span></div>
        <button className="insight-button" onClick={() => onInsight("Which customer accounts need attention this week?")}>Ask AI Analyst <ChevronRight size={16} /></button>
      </article>
    </section>

    <section className="lower-grid">
      <article className="panel customer-panel"><div className="panel-head"><div><span className="section-label">Customer health</span><h2>Accounts needing attention</h2></div><button className="text-action" onClick={() => onNavigate("customers")}>View all <ChevronRight size={15} /></button></div><div className="customer-stack">{customers.slice(0, 3).map((customer) => <button className="customer-row" key={customer.name} onClick={() => onNavigate("customers")}><Avatar initials={customer.initials} tone={customer.tone} /><span className="customer-name"><b>{customer.name}</b><small>{customer.type} · {customer.owner}</small></span><span className="health-track"><i><em style={{ width: `${customer.score}%` }} /></i><small>{customer.score}/100</small></span><span className={`health-badge ${customer.health.toLowerCase().replace(" ", "-")}`}>{customer.health}</span><ChevronRight className="row-arrow" size={17} /></button>)}</div></article>
      <article className="panel activity-panel"><div className="panel-head"><div><span className="section-label">Workspace activity</span><h2>Latest signals</h2></div><button className="more-icon" onClick={() => onNotice("Activity history will query workspace events")}><MoreHorizontal size={19} /></button></div><div className="activity-list"><ActivityItem icon={<Github size={15} />} tone="cyan" title="Release v2.4 shipped" desc="Connected repository · 14 minutes ago"/><ActivityItem icon={<TrendingUp size={15} />} tone="violet" title="Pipeline moved +$8,400" desc="Cloudline moved to proposal · 1 hour ago"/><ActivityItem icon={<Users size={15} />} tone="amber" title="New contact added" desc="Northstar Labs · 2 hours ago"/></div></article>
    </section>
  </>;
}

function ActivityItem({ icon, tone, title, desc }: { icon: React.ReactNode; tone: string; title: string; desc: string }) {
  return <div className="activity-item"><span className={`activity-icon ${tone}`}>{icon}</span><span><b>{title}</b><small>{desc}</small></span><i /></div>;
}

function CustomersView({ search, onSearch, items, onNotice }: { search: string; onSearch: (value: string) => void; items: typeof customers; onNotice: (message?: string) => void }) {
  return <section className="view-page"><div className="page-heading compact"><div><p className="eyebrow">Customer intelligence</p><h1>Customers<span>.</span></h1><p>Track account health, lifecycle, and relationship context.</p></div><div className="heading-actions"><button className="secondary-button" onClick={() => onNotice("CSV import will validate data server-side")}><Upload size={16} /> Import</button><button className="primary-button" onClick={() => onNotice("Customer form will persist to Supabase next")}><Plus size={17} /> Add customer</button></div></div><article className="panel table-panel"><div className="table-tools"><label className="search-field"><Search size={17} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search customers" /></label><button className="secondary-button" onClick={() => onNotice("Filters will save per workspace")}><Filter size={16} /> Filter</button></div><div className="data-table"><div className="table-head"><span>Customer</span><span>Owner</span><span>Health</span><span>Revenue</span><span /></div>{items.map((customer) => <div className="table-row" key={customer.name}><span className="table-customer"><Avatar initials={customer.initials} tone={customer.tone} /><span><b>{customer.name}</b><small>{customer.type} account</small></span></span><span>{customer.owner}</span><span><i className={`health-badge ${customer.health.toLowerCase().replace(" ", "-")}`}>{customer.health}</i></span><strong>{customer.value}</strong><button className="row-menu" onClick={() => onNotice(`Customer detail for ${customer.name} is the next backend view`)}><MoreHorizontal size={18} /></button></div>)}{items.length === 0 && <div className="empty-table">No customers match this search.</div>}</div></article></section>;
}

function PipelineView({ onNotice }: { onNotice: (message?: string) => void }) {
  return <section className="view-page"><div className="page-heading compact"><div><p className="eyebrow">Revenue operations</p><h1>Pipeline<span>.</span></h1><p>Keep your forecast connected to customer context.</p></div><button className="primary-button" onClick={() => onNotice("Deal creation will persist to the workspace pipeline")}><Plus size={17} /> New deal</button></div><div className="pipeline-stats"><span><b>$64,000</b> weighted forecast</span><span><b>18</b> active deals</span><span><b>72%</b> forecast confidence</span></div><div className="pipeline-board">{dealColumns.map((column, index) => <article className="pipeline-column" key={column.stage}><div><span className={`stage-dot stage-${index}`} /><b>{column.stage}</b><small>{column.total}</small></div>{column.deals.map((deal, dealIndex) => <button className="deal-card" key={deal} onClick={() => onNotice(`${deal} will open a deal detail drawer`)}><span className="deal-avatar">{deal.slice(0, 1)}</span><b>{deal}</b><small>{dealIndex === 0 ? "Due this month" : "Owner: Mira Kim"}</small><i>${[8200, 6000, 12400, 9800][(index + dealIndex) % 4].toLocaleString()}</i></button>)}<button className="add-deal" onClick={() => onNotice("New deals will be added with a validated stage")}><Plus size={15} /> Add deal</button></article>)}</div></section>;
}

function MetricsView({ onNotice }: { onNotice: (message?: string) => void }) {
  return <section className="view-page"><div className="page-heading compact"><div><p className="eyebrow">Metric library</p><h1>Metrics<span>.</span></h1><p>Define trusted data points before you ask AI to explain them.</p></div><div className="heading-actions"><button className="secondary-button" onClick={() => onNotice("CSV import preview will appear here")}><Upload size={16} /> Import CSV</button><button className="primary-button" onClick={() => onNotice("Metric definition form will open here")}><Plus size={17} /> New metric</button></div></div><section className="metric-library">{[{ name: "Monthly recurring revenue", key: "MRR", value: "$48,240", trend: "+12.4%", tone: "cyan" }, { name: "Customer health", key: "HEALTH", value: "78.4", trend: "+4.2 pts", tone: "violet" }, { name: "Pipeline coverage", key: "PIPE", value: "1.8×", trend: "+0.3×", tone: "amber" }].map((metric) => <article className="metric-card" key={metric.key}><span className={`metric-symbol ${metric.tone}`}>{metric.key.slice(0, 1)}</span><div><small>{metric.key}</small><h2>{metric.name}</h2></div><strong>{metric.value}</strong><span className="positive"><ArrowUpRight size={13} />{metric.trend}</span><button onClick={() => onNotice(`${metric.name} drill-down needs real snapshots first`)}>Open metric <ChevronRight size={15} /></button></article>)}</section></section>;
}

function AnalystView({ prompt, answer, onAsk }: { prompt: string; answer: string; onAsk: (question: string) => void }) {
  const [draft, setDraft] = useState(prompt);
  return <section className="analyst-page"><div className="analyst-hero"><div className="analyst-icon"><Bot size={24} /></div><p className="eyebrow"><Sparkles size={13} />Workspace intelligence</p><h1>Ask your business,<br />not another dashboard.</h1><p>PulseBoard will connect your customer, pipeline, metric, and GitHub signals into evidence-aware answers.</p></div><div className="analyst-workspace"><article className="panel analyst-answer"><div className="analyst-answer-head"><span><Sparkles size={15} />AI Analyst preview</span><small>Evidence-aware answer</small></div><p>{answer}</p><div className="evidence-box"><b>Expected evidence when connected</b><span><HeartPulse size={14} /> Customer health score</span><span><BarChart3 size={14} /> 30-day metric trend</span><span><Activity size={14} /> Recent workspace activity</span></div></article><div className="suggestions"><span>Try a suggested question</span>{["Which accounts need attention?", "Why did pipeline change this week?", "Summarize our latest product signals."].map((question) => <button key={question} onClick={() => { setDraft(question); onAsk(question); }}>{question}<ChevronRight size={15} /></button>)}</div><form className="ai-composer" onSubmit={(event) => { event.preventDefault(); onAsk(draft); }}><Sparkles size={19} /><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about your workspace…" /><button aria-label="Ask AI" type="submit"><ArrowUpRight size={18} /></button></form></div></section>;
}

function ReportsView({ onNotice }: { onNotice: (message?: string) => void }) {
  return <section className="view-page"><div className="page-heading compact"><div><p className="eyebrow">Shareable intelligence</p><h1>Reports<span>.</span></h1><p>Turn workspace signals into useful weekly decisions.</p></div><button className="primary-button" onClick={() => onNotice("Report builder will save workspace-scoped views")}><Plus size={17} /> Create report</button></div><div className="report-grid">{reportCards.map((report, index) => <article className="report-card" key={report.title}><div className={`report-icon report-${index}`}><FileBarChart size={20} /></div><small>{report.when}</small><h2>{report.title}</h2><p>{report.detail}</p><div><button onClick={() => onNotice(`${report.title} preview will use saved workspace data`)}>Open report <ChevronRight size={15} /></button><button className="icon-inline" onClick={() => onNotice("Export will be enabled after report data is connected")} aria-label="Export report"><Download size={17} /></button></div></article>)}</div></section>;
}

function SettingsView({ onNotice }: { onNotice: (message?: string) => void }) {
  return <section className="view-page"><div className="page-heading compact"><div><p className="eyebrow">Workspace controls</p><h1>Settings<span>.</span></h1><p>Manage membership, sources, and workspace preferences.</p></div></div><div className="settings-grid"><article className="panel settings-card"><div className="settings-heading"><Building2 size={19} /><span><b>Workspace</b><small>Arcfield · Demo workspace</small></span></div><button onClick={() => onNotice("Workspace preferences will be stored per tenant")}>Workspace preferences <ChevronRight size={16} /></button><button onClick={() => onNotice("Member roles will be enforced by Supabase RLS")}>Members and roles <ChevronRight size={16} /></button></article><article className="panel settings-card"><div className="settings-heading"><Github size={19} /><span><b>Integrations</b><small>Connect permitted business signals</small></span></div><button onClick={() => onNotice("GitHub OAuth connection will run server-side")}>GitHub connector <span className="connection-status">Not connected</span><ChevronRight size={16} /></button><button onClick={() => onNotice("Data source sync runs will appear here")}>Sync history <ChevronRight size={16} /></button></article><article className="panel settings-card"><div className="settings-heading"><SlidersHorizontal size={19} /><span><b>Data controls</b><small>Safe workspace operations</small></span></div><button onClick={() => onNotice("CSV export will be audit logged")}>Export workspace data <ChevronRight size={16} /></button><button onClick={() => onNotice("Audit events will be visible to workspace owners")}>Audit activity <ChevronRight size={16} /></button></article></div></section>;
}
