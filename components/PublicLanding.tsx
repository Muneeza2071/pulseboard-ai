"use client";

import { ArrowRight, CheckCircle2, Database, LockKeyhole, Network, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { AuthControls } from "./AuthControls";

function LandingMark() {
  return <span className="landing-mark" aria-hidden="true"><i /><i /><i /></span>;
}

export function PublicLanding({ onAuthenticated }: { onAuthenticated: (name: string | null) => void }) {
  return <main className="landing-page" id="top">
    <header className="landing-header">
      <a className="landing-brand" href="#top" aria-label="PulseBoard AI home"><LandingMark /><span>pulse<b>board</b><em>AI</em></span></a>
      <nav className="landing-nav" aria-label="Landing navigation"><a href="#workflow">Workflow</a><a href="#security">Security model</a><a href="#boundaries">Boundaries</a></nav>
      <div className="landing-header-actions"><a className="landing-github" href="https://github.com/AbbasFullstack/PulseBoard-AI" target="_blank" rel="noreferrer">View source <ArrowRight size={14} /></a><AuthControls onUserChange={onAuthenticated} actionLabel="Open workspace" /></div>
    </header>

    <section className="landing-hero">
      <div className="landing-hero-copy">
        <p className="landing-eyebrow"><span /> Workspace-scoped CRM foundation</p>
        <h1>Customer intelligence that stays <i>inside the workspace.</i></h1>
        <p className="landing-intro">Create a protected workspace, manage customer and deal records, and keep the data boundary visible. PulseBoard starts empty by design—no fabricated revenue and no invented customer records.</p>
        <div className="landing-actions" id="secure-access"><AuthControls onUserChange={onAuthenticated} actionLabel="Open secure workspace" /><a className="landing-secondary" href="#security">Explore the security model <ArrowRight size={15} /></a></div>
        <div className="landing-proof"><span><CheckCircle2 size={15} /> Live onboarding validated</span><span><CheckCircle2 size={15} /> Real-data empty states</span></div>
      </div>

      <div className="workspace-schematic" aria-label="PulseBoard workspace data flow schematic">
        <div className="schematic-glow" />
        <div className="schematic-title"><span><ShieldCheck size={15} /></span><div><small>ACTIVE BOUNDARY</small><b>Your secure workspace</b></div><i>RLS protected</i></div>
        <div className="schematic-flow"><div className="schematic-node cyan"><span><Database size={18} /></span><b>Customers</b><small>Real account records</small></div><div className="schematic-node violet"><span><Network size={18} /></span><b>Contacts</b><small>Workspace relationships</small></div><div className="schematic-node amber"><span><Workflow size={18} /></span><b>Pipeline</b><small>Deals with context</small></div></div>
        <div className="schematic-divider"><i /><span>Scoped queries only</span><i /></div>
        <div className="schematic-summary"><div><small>Dashboard</small><b>Workspace-only totals</b></div><span><LockKeyhole size={15} /> Authenticated access</span></div>
      </div>
    </section>

    <section className="landing-strip" aria-label="Product foundations"><span><LockKeyhole size={16} /> Supabase Auth</span><span><Database size={16} /> PostgreSQL RLS</span><span><Workflow size={16} /> Workspace CRM</span><span><Sparkles size={16} /> Manual integrations</span></section>

    <section className="landing-section" id="workflow">
      <div className="landing-section-head"><p className="landing-eyebrow"><span /> Product workflow</p><h2>Build context from <i>real workspace records.</i></h2><p>PulseBoard keeps its product claims small and verifiable: workspace data, CRM records, pipeline context, and calculated roll-ups.</p></div>
      <div className="landing-feature-grid">
        <article><span className="feature-icon cyan"><LockKeyhole size={19} /></span><h3>Workspace by default</h3><p>Workspace creation is bound to the authenticated caller. Row-level security scopes product data to the workspace.</p></article>
        <article><span className="feature-icon violet"><Database size={19} /></span><h3>Start with real records</h3><p>Add customers, contacts, and deals when there is real information to manage. Empty workspaces stay visibly empty.</p></article>
        <article><span className="feature-icon amber"><Workflow size={19} /></span><h3>Pipeline with context</h3><p>Keep a deal’s stage, value, probability, expected close, and customer link together in one workspace view.</p></article>
      </div>
    </section>

    <section className="landing-section landing-security" id="security">
      <div className="security-copy"><p className="landing-eyebrow"><span /> Explicit data boundary</p><h2>A public product page should not hide the <i>security model.</i></h2><p>PulseBoard’s browser client uses only public Supabase configuration. Workspace ownership and access rules remain in the database, while provider credentials stay server-side.</p><a className="landing-secondary" href="#boundaries">See current boundaries <ArrowRight size={15} /></a></div>
      <div className="security-list"><div><span>01</span><p><b>Caller-bound onboarding</b><small>The database derives the workspace owner from the authenticated caller.</small></p></div><div><span>02</span><p><b>Workspace-scoped records</b><small>Customer, contact, and pipeline queries are filtered by the active workspace.</small></p></div><div><span>03</span><p><b>Server-only provider path</b><small>AI requests require a signed-in session and server-side configuration.</small></p></div></div>
    </section>

    <section className="landing-section landing-boundaries" id="boundaries">
      <div className="landing-section-head"><p className="landing-eyebrow"><span /> Honest product status</p><h2>Useful foundations, <i>deliberate limits.</i></h2></div>
      <div className="boundary-grid"><article><Sparkles size={18} /><h3>AI stays unconfigured by default</h3><p>The AI Analyst is behind a server-side boundary and remains unavailable until a provider is configured.</p></article><article><Network size={18} /><h3>Integrations stay opt-in</h3><p>GitHub and HubSpot connection paths are user-authorised and manual. No sync starts automatically.</p></article><article><ShieldCheck size={18} /><h3>No audit claim</h3><p>These are source-backed product boundaries, not a claim of a third-party security audit.</p></article></div>
    </section>

    <section className="landing-final"><div><p className="landing-eyebrow"><span /> Start with a protected workspace</p><h2>Keep the customer context where it belongs.</h2><p>Open a secure workspace to add your own records. PulseBoard will not fill the product with sample business data for you.</p></div><AuthControls onUserChange={onAuthenticated} actionLabel="Create secure workspace" /></section>

    <footer className="landing-footer"><a className="landing-brand" href="#top"><LandingMark /><span>pulse<b>board</b><em>AI</em></span></a><p>Independently built full-stack portfolio project by Abbas Hussain.</p><div><a href="https://github.com/AbbasFullstack/PulseBoard-AI" target="_blank" rel="noreferrer">GitHub</a><a href="https://abbas-portfolio-beta.vercel.app" target="_blank" rel="noreferrer">Portfolio</a><a href="https://www.linkedin.com/in/abbas-hussain-56a61338b/" target="_blank" rel="noreferrer">LinkedIn</a></div></footer>
  </main>;
}
