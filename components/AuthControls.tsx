"use client";

import { AtSign, Building2, KeyRound, LoaderCircle, LogIn, LogOut, ShieldCheck, UserPlus, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type Mode = "sign-in" | "sign-up";
export type WorkspaceRef = { id: string; name: string };

function displayName(user: User | null) {
  if (!user) return "";
  const profileName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  return profileName || user.email?.split("@")[0] || "PulseBoard member";
}

function workspaceSlug(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export function AuthControls({ onUserChange, onWorkspaceChange }: {
  onUserChange?: (name: string | null) => void;
  onWorkspaceChange?: (workspace: WorkspaceRef | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("sign-in");
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceRef | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    async function syncUser(nextUser: User | null) {
      setUser(nextUser);
      onUserChange?.(nextUser ? displayName(nextUser) : null);
      if (!nextUser) {
        setWorkspace(null);
        onWorkspaceChange?.(null);
        setWorkspaceOpen(false);
        return;
      }

      const { data } = await client
        .from("pulseboard_workspaces")
        .select("id, name")
        .limit(1)
        .maybeSingle();
      setWorkspace(data ?? null);
      onWorkspaceChange?.(data ?? null);
      setWorkspaceOpen(!data);
    }

    void client.auth.getUser().then(({ data }) => syncUser(data.user ?? null));
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [onUserChange, onWorkspaceChange, supabase]);

  const resetFeedback = () => setNotice("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setNotice("Add your public Supabase URL and publishable key before using authentication.");
      return;
    }
    setBusy(true);
    setNotice("");

    try {
      if (mode === "sign-up") {
        if (name.trim().length < 2) throw new Error("Enter your name so PulseBoard can personalise your workspace.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Account created. Check your email to verify it, then sign in.");
        } else {
          setNotice("Account created. Your secure workspace is ready to set up.");
          setOpen(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setNotice("Signed in successfully.");
        setOpen(false);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Authentication could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    setNotice("Signed out. Your workspace data remains protected.");
  }

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    const cleanedName = workspaceName.trim();
    if (cleanedName.length < 2) {
      setNotice("Workspace name must contain at least two characters.");
      return;
    }

    setBusy(true);
    setNotice("");
    const { data, error } = await supabase
      .from("pulseboard_workspaces")
      .insert({ name: cleanedName, slug: workspaceSlug(cleanedName), owner_id: user.id })
      .select("id, name")
      .single();
    setBusy(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setWorkspace(data);
    onWorkspaceChange?.(data);
    setWorkspaceOpen(false);
    setWorkspaceName("");
    setNotice("Workspace created. You are its owner and first member.");
  }

  return <>
    {user ? (
      <button className="auth-user" onClick={() => workspace ? signOut() : setWorkspaceOpen(true)} disabled={busy} title={workspace ? "Sign out securely" : "Set up your workspace"}>
        <span>{displayName(user).slice(0, 2).toUpperCase()}</span>
        <b>{workspace ? displayName(user).split(" ")[0] : "Set up workspace"}</b>
        {workspace ? <LogOut size={15} /> : <Building2 size={15} />}
      </button>
    ) : (
      <button className="auth-button" onClick={() => { resetFeedback(); setOpen(true); }}>
        <LogIn size={15} /> Sign in
      </button>
    )}

    {notice && !open && !workspaceOpen && <div className="auth-notice" role="status">{notice}</div>}

    {open && (
      <div className="auth-backdrop" onClick={() => !busy && setOpen(false)}>
        <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(event) => event.stopPropagation()}>
          <button className="auth-close" onClick={() => setOpen(false)} aria-label="Close authentication"><X size={19} /></button>
          <div className="auth-brand"><span><ShieldCheck size={20} /></span><p>Secure workspace access</p></div>
          <h2 id="auth-title">{mode === "sign-in" ? "Welcome back." : "Build your workspace."}</h2>
          <p className="auth-description">{mode === "sign-in" ? "Sign in to view only the workspaces you belong to." : "Create a protected PulseBoard account with your own workspace access."}</p>
          {!supabase && <div className="auth-config-note"><ShieldCheck size={15} /><span>Supabase connection is not configured yet. Add the two public environment variables in `.env.local` or Vercel to enable live authentication.</span></div>}
          <form onSubmit={submit}>
            {mode === "sign-up" && <label><span>Full name</span><div><UserPlus size={16} /><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Abbas Hussain" required /></div></label>}
            <label><span>Email address</span><div><AtSign size={16} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div></label>
            <label><span>Password</span><div><KeyRound size={16} /><input type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required /></div></label>
            {notice && <p className="auth-form-notice">{notice}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : mode === "sign-in" ? <LogIn size={17} /> : <UserPlus size={17} />}{mode === "sign-in" ? "Sign in securely" : "Create secure account"}</button>
          </form>
          <button className="auth-mode" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); resetFeedback(); }}>{mode === "sign-in" ? "New to PulseBoard? Create an account" : "Already have an account? Sign in"}</button>
        </section>
      </div>
    )}

    {user && workspaceOpen && (
      <div className="auth-backdrop" onClick={() => !busy && setWorkspaceOpen(false)}>
        <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="workspace-title" onClick={(event) => event.stopPropagation()}>
          <button className="auth-close" onClick={() => setWorkspaceOpen(false)} aria-label="Close workspace setup"><X size={19} /></button>
          <div className="auth-brand"><span><Building2 size={20} /></span><p>Workspace onboarding</p></div>
          <h2 id="workspace-title">Create your first workspace.</h2>
          <p className="auth-description">This workspace becomes your private customer intelligence area. RLS automatically makes you its owner and first member.</p>
          <form onSubmit={createWorkspace}>
            <label><span>Workspace name</span><div><Building2 size={16} /><input autoFocus value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Arcfield" minLength={2} maxLength={80} required /></div></label>
            {notice && <p className="auth-form-notice">{notice}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Building2 size={17} />}Create protected workspace</button>
          </form>
        </section>
      </div>
    )}
  </>;
}
