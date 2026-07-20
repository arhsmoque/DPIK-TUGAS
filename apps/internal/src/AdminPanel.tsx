import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callRpc } from "./rpc";

interface GrantRow {
  identity_id: string;
  bundle_code: string;
  basis: string;
  granted_at: string;
  revoked_at: string | null;
}

interface DefectRow {
  id: string;
  summary: string;
  details: string | null;
  acknowledged: boolean;
  created_at: string;
}

interface SystemStatusRow {
  active: boolean;
  message: string | null;
}

interface Props {
  supabase: SupabaseClient;
  projectId: string;
  permissions: Set<string>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}

export function AdminPanel({
  supabase,
  projectId,
  permissions,
  onError,
  onNotice
}: Props): JSX.Element {
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [defects, setDefects] = useState<DefectRow[]>([]);
  const [status, setStatus] = useState<SystemStatusRow | null>(null);
  const canAdminister = permissions.has("administration.manage_roles");

  const refresh = useCallback(async () => {
    const [grantsResult, statusResult] = await Promise.all([
      canAdminister
        ? supabase
            .from("project_role_assignments")
            .select("identity_id,bundle_code,basis,granted_at,revoked_at")
            .eq("project_id", projectId)
            .order("granted_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabase.from("system_status").select("active,message").eq("id", 1).maybeSingle()
    ]);
    if (grantsResult.error) onError(grantsResult.error.message);
    else setGrants((grantsResult.data ?? []) as GrantRow[]);
    if (statusResult.error) onError(statusResult.error.message);
    else setStatus(statusResult.data as SystemStatusRow | null);
  }, [supabase, projectId, onError, canAdminister]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function grantBundle(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await callRpc(
      supabase,
      "grant_role_bundle",
      {
        target_project_id: projectId,
        grantee_email: form.get("email"),
        bundle_code: form.get("bundleCode"),
        basis: form.get("basis")
      },
      "Capability granted."
    );
    if (!result.ok) onError(result.message);
    else {
      event.currentTarget.reset();
      onNotice(result.message);
      await refresh();
    }
  }

  async function revokeBundle(grant: GrantRow): Promise<void> {
    const email = window.prompt("Confirm the grantee's email to revoke:");
    if (!email) return;
    const result = await callRpc(
      supabase,
      "revoke_role_bundle",
      { target_project_id: projectId, grantee_email: email, bundle_code: grant.bundle_code },
      "Capability revoked."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function updateBanner(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await callRpc(
      supabase,
      "set_system_status",
      { status_active: form.get("active") === "on", status_message: form.get("message") },
      "System status updated."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function refreshDefects(): Promise<void> {
    const result = await supabase
      .from("defect_reports")
      .select("id,summary,details,acknowledged,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (result.error) onError(result.error.message);
    else setDefects((result.data ?? []) as DefectRow[]);
  }

  async function reportDefect(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await callRpc(
      supabase,
      "report_defect",
      { target_project_id: projectId, summary: form.get("summary"), details: form.get("details") },
      "Defect reported."
    );
    if (!result.ok) onError(result.message);
    else {
      event.currentTarget.reset();
      onNotice(result.message);
      await refreshDefects();
    }
  }

  async function acknowledgeDefect(row: DefectRow): Promise<void> {
    const result = await callRpc(
      supabase,
      "acknowledge_defect",
      { target_defect_report_id: row.id },
      "Defect acknowledged."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refreshDefects();
    }
  }

  return (
    <>
      {status?.active && status.message && (
        <section className="health" style={{ borderLeftColor: "var(--accent-gold)" }}>
          <strong>System notice</strong>
          <span>{status.message}</span>
        </section>
      )}

      {canAdminister && (
        <section className="panel">
          <h3>Capability grants</h3>
          <form className="create-form" onSubmit={(event) => void grantBundle(event)}>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Bundle code
              <input name="bundleCode" required placeholder="startup_work_owner_admin" />
            </label>
            <label>
              Basis
              <input name="basis" required placeholder="10 years design experience" />
            </label>
            <button type="submit">Grant</button>
          </form>
          {grants.length === 0 ? (
            <p>No grants recorded.</p>
          ) : (
            <div className="work-list">
              {grants.map((grant) => (
                <article key={`${grant.identity_id}-${grant.bundle_code}-${grant.granted_at}`}>
                  <div>
                    <span className="badge">{grant.bundle_code}</span>
                    <p>{grant.basis}</p>
                    <small>
                      {grant.revoked_at
                        ? `Revoked ${new Date(grant.revoked_at).toLocaleDateString()}`
                        : "Active"}
                    </small>
                  </div>
                  {!grant.revoked_at && (
                    <div className="actions">
                      <button className="secondary" onClick={() => void revokeBundle(grant)}>
                        Revoke
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          <h3>System status banner</h3>
          <form className="create-form" onSubmit={(event) => void updateBanner(event)}>
            <label>
              Active
              <input name="active" type="checkbox" defaultChecked={status?.active ?? false} />
            </label>
            <label>
              Message
              <input
                name="message"
                defaultValue={status?.message ?? ""}
                placeholder="Receipt-verification updates are delayed"
              />
            </label>
            <button type="submit">Update</button>
          </form>
        </section>
      )}

      <section className="panel">
        <h3>Report a problem</h3>
        <form className="create-form" onSubmit={(event) => void reportDefect(event)}>
          <label>
            Summary
            <input
              name="summary"
              required
              placeholder="The blocker cannot be saved due to an application error"
            />
          </label>
          <label>
            Details
            <input name="details" />
          </label>
          <button type="submit">Report</button>
        </form>
        <button className="secondary" onClick={() => void refreshDefects()}>
          Show recent reports
        </button>
        {defects.length > 0 && (
          <div className="work-list">
            {defects.map((defect) => (
              <article key={defect.id}>
                <div>
                  <span className="badge">{defect.acknowledged ? "Acknowledged" : "Open"}</span>
                  <h4>{defect.summary}</h4>
                  {defect.details && <p>{defect.details}</p>}
                </div>
                {!defect.acknowledged && canAdminister && (
                  <div className="actions">
                    <button onClick={() => void acknowledgeDefect(defect)}>Acknowledge</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
