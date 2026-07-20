import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import "./app.css";
import { WorkThreadActions, type WorkThreadRow } from "./WorkThreadActions";
import { SubmissionsPanel } from "./SubmissionsPanel";
import { DispatchPanel } from "./DispatchPanel";
import { ReceiptEvidencePanel } from "./ReceiptEvidencePanel";
import { ClaimsPanel } from "./ClaimsPanel";
import { AdminPanel } from "./AdminPanel";
import { GovernanceGatesPanel, type GateRow } from "./GovernanceGatesPanel";
import { callRpc } from "./rpc";

type NavTab =
  "myWork" | "submissions" | "dispatch" | "receiptEvidence" | "claims" | "governance" | "admin";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const configured = Boolean(supabaseUrl && supabaseAnonKey);
const supabase = configured ? createClient(supabaseUrl!, supabaseAnonKey!) : null;

interface StartupProject {
  id: string;
  code: string;
  name: string;
  organisationId: string;
  organisationName: string;
  permissions: string[];
}

interface StartupContext {
  identity: { id: string; email: string };
  projects: StartupProject[];
}

export function App(): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<StartupContext | null>(null);
  const [work, setWork] = useState<WorkThreadRow[]>([]);
  const [deferredGates, setDeferredGates] = useState<GateRow[]>([]);
  const [activeTab, setActiveTab] = useState<NavTab>("myWork");

  // Theme dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark";
  });

  const project = context?.projects[0] ?? null;
  const permissions = useMemo(() => new Set(project?.permissions ?? []), [project]);

  // Sync body dark-mode class
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const contextResult = await supabase.rpc("startup_context");
    if (contextResult.error) {
      setError(contextResult.error.message);
      setLoading(false);
      return;
    }
    const nextContext = contextResult.data as StartupContext;
    setContext(nextContext);
    const projectId = nextContext.projects[0]?.id;
    if (!projectId) {
      setError("No active Project membership was found.");
      setLoading(false);
      return;
    }
    const workResult = await supabase
      .from("work_threads")
      .select(
        "id,title,expected_outcome,source_reference,lifecycle,current_assignee_id,due_at,version,created_at,blocked_outcome,blocker_required_resolver,recall_requested_by,recall_reason,renegotiation_requested_by,renegotiation_reason"
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (workResult.error) setError(workResult.error.message);
    else setWork((workResult.data ?? []) as WorkThreadRow[]);

    // Fetched at App level (not only inside GovernanceGatesPanel) so the
    // deferred-gate warning stays visible regardless of active tab -- the
    // operator's absolute-veto override must never require a tab switch to
    // see or act on.
    const gatesResult = await supabase
      .from("governance_gates")
      .select(
        "id,gate_type,lifecycle,deferred_reason,deferred_by,deferred_at,approved_by,approved_at,version"
      )
      .eq("project_id", projectId)
      .eq("lifecycle", "Deferred");
    if (gatesResult.error) setError(gatesResult.error.message);
    else setDeferredGates((gatesResult.data ?? []) as GateRow[]);

    setLoading(false);
  }, []);

  async function reconsiderFromBanner(gate: GateRow): Promise<void> {
    if (!supabase) return;
    const result = await callRpc(
      supabase,
      "reconsider_gate_deferral",
      { target_gate_id: gate.id, expected_record_version: gate.version },
      "Deferral reconsidered — gate is Open again."
    );
    if (!result.ok) setError(result.message);
    else {
      setNotice(result.message);
      await refresh();
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) void refresh();
    else {
      setContext(null);
      setWork([]);
      setLoading(false);
    }
  }, [session, refresh]);

  async function requestMagicLink(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!supabase) return;
    setError("");
    const result = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (result.error) setError(result.error.message);
    else setNotice("Magic link sent. Check your email to continue.");
  }

  async function createWork(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!supabase || !project) return;
    const form = new FormData(event.currentTarget);
    const result = await supabase.rpc("create_work_thread", {
      target_project_id: project.id,
      work_title: form.get("title"),
      work_expected_outcome: form.get("outcome"),
      work_source_reference: form.get("source")
    });
    if (result.error) setError(result.error.message);
    else {
      event.currentTarget.reset();
      setNotice("Work Thread created.");
      await refresh();
    }
  }

  async function assignWork(item: WorkThreadRow): Promise<void> {
    if (!supabase) return;
    const due = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const result = await supabase.rpc("assign_work", {
      target_work_thread_id: item.id,
      assignee_email: "smoque@gmail.com",
      commitment_due_at: due,
      work_assignment_reason: "DPIK Tugas startup assignment",
      expected_record_version: item.version
    });
    if (result.error) setError(result.error.message);
    else {
      setNotice("Assigned to smoque@gmail.com with a 24-hour due commitment.");
      await refresh();
    }
  }

  if (!configured) {
    return (
      <main className="state">
        <h1>TUGAS is not configured</h1>
        <p>Load the ARH environment and restart the app.</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="login-shell">
        <div className="login-toggle-container">
          <button
            className="theme-toggle-btn"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle Night Mode"
            title="Toggle Night Mode"
          >
            {darkMode ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
        </div>
        <section className="login-card">
          {/* Logo preserved exactly as requested */}
          <div className="mark">DPIK</div>
          <p className="eyebrow">DPI Konsult Sdn Bhd</p>
          <h1>TUGAS startup</h1>
          <p>Sign in with an approved startup email. No password is stored by this application.</p>
          <form onSubmit={(event) => void requestMagicLink(event)}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <button type="submit">Send magic link</button>
          </form>
          {notice && <p className="notice">{notice}</p>}
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <div className="shell">
      <aside>
        {/* Logo preserved exactly as requested */}
        <div className="mark">DPIK</div>
        <h1>TUGAS</h1>
        <nav>
          {(
            [
              ["myWork", "My Work"],
              ["submissions", "Submissions"],
              ["dispatch", "Dispatch"],
              ["receiptEvidence", "Receipt Evidence"],
              ["claims", "Claims"],
              ["governance", "Governance"],
              ["admin", "Admin"]
            ] as [NavTab, string][]
          ).map(([tab, label]) => (
            <span
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
              style={{ cursor: "pointer" }}
            >
              {label}
            </span>
          ))}
        </nav>
        <button className="secondary" onClick={() => void supabase?.auth.signOut()}>
          Sign out
        </button>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">{project?.organisationName ?? "Loading"}</p>
            <h2>{project?.name ?? "My Work"}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              className="theme-toggle-btn"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label="Toggle Night Mode"
              title="Toggle Night Mode"
            >
              {darkMode ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
            <div className="identity">{context?.identity.email}</div>
          </div>
        </header>
        <section className="health">
          <strong>Startup health</strong>
          <span className="healthy">Connected</span>
          <span>{work.length} Work Threads</span>
          <button className="secondary" onClick={() => void refresh()}>
            Refresh
          </button>
        </section>
        {deferredGates.map((gate) => (
          <div key={gate.id} className="blocker-banner deferred-gate-banner">
            <strong>Deferred at your own risk: {gate.gate_type}</strong>
            <span>{gate.deferred_reason}</span>
            <small>
              by {gate.deferred_by} at{" "}
              {gate.deferred_at ? new Date(gate.deferred_at).toLocaleString() : ""}
            </small>
            {permissions.has("governance.override_gate") && (
              <button className="secondary" onClick={() => void reconsiderFromBanner(gate)}>
                Reconsider
              </button>
            )}
          </div>
        ))}
        {error && <p className="error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}

        {activeTab === "myWork" && (
          <>
            {permissions.has("work.create") && (
              <section className="panel">
                <h3>Create Work Thread</h3>
                <form className="create-form" onSubmit={(event) => void createWork(event)}>
                  <label>
                    Title
                    <input name="title" required />
                  </label>
                  <label>
                    Expected outcome
                    <input name="outcome" required />
                  </label>
                  <label>
                    Source reference
                    <input name="source" required />
                  </label>
                  <button type="submit">Create</button>
                </form>
              </section>
            )}
            <section className="panel">
              <h3>My Work</h3>
              {loading ? (
                <p>Loading current state…</p>
              ) : work.length === 0 ? (
                <p>No Work Threads yet.</p>
              ) : (
                <div className="work-list">
                  {work.map((item) => (
                    <article key={item.id}>
                      <div>
                        <span className="status-pill" data-status={item.lifecycle}>
                          {item.lifecycle}
                        </span>
                        <h4>{item.title}</h4>
                        <p>{item.expected_outcome}</p>
                        <small>
                          {item.source_reference}
                          {item.due_at ? ` · due ${new Date(item.due_at).toLocaleString()}` : ""}
                        </small>
                        {item.blocked_outcome && (
                          <div className="blocker-banner">Blocked: {item.blocked_outcome}</div>
                        )}
                        {item.recall_requested_by && (
                          <div className="negotiation-banner">
                            Recall requested — {item.recall_reason}
                          </div>
                        )}
                        {item.renegotiation_requested_by && (
                          <div className="negotiation-banner">
                            Renegotiation requested — {item.renegotiation_reason}
                          </div>
                        )}
                      </div>
                      <div className="actions">
                        {item.lifecycle === "Unassigned" && permissions.has("work.assign") && (
                          <button onClick={() => void assignWork(item)}>Assign to Smoque</button>
                        )}
                        {supabase && (
                          <WorkThreadActions
                            item={item}
                            identityId={context?.identity.id}
                            permissions={permissions}
                            supabase={supabase}
                            onError={setError}
                            onSuccess={setNotice}
                            onChanged={refresh}
                          />
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {supabase && project && activeTab === "submissions" && (
          <SubmissionsPanel
            supabase={supabase}
            projectId={project.id}
            permissions={permissions}
            onError={setError}
            onNotice={setNotice}
          />
        )}
        {supabase && project && activeTab === "dispatch" && (
          <DispatchPanel
            supabase={supabase}
            projectId={project.id}
            permissions={permissions}
            onError={setError}
            onNotice={setNotice}
          />
        )}
        {supabase && project && activeTab === "receiptEvidence" && (
          <ReceiptEvidencePanel
            supabase={supabase}
            projectId={project.id}
            permissions={permissions}
            onError={setError}
            onNotice={setNotice}
          />
        )}
        {supabase && project && activeTab === "claims" && (
          <ClaimsPanel
            supabase={supabase}
            projectId={project.id}
            permissions={permissions}
            onError={setError}
            onNotice={setNotice}
          />
        )}
        {supabase && project && activeTab === "governance" && (
          <GovernanceGatesPanel
            supabase={supabase}
            projectId={project.id}
            permissions={permissions}
            onError={setError}
            onNotice={setNotice}
          />
        )}
        {supabase && project && activeTab === "admin" && (
          <AdminPanel
            supabase={supabase}
            projectId={project.id}
            permissions={permissions}
            onError={setError}
            onNotice={setNotice}
          />
        )}
      </main>
    </div>
  );
}
