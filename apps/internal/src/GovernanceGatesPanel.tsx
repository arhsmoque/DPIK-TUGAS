import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callRpc } from "./rpc";

export interface GateRow {
  id: string;
  gate_type: string;
  lifecycle: string;
  deferred_reason: string | null;
  deferred_by: string | null;
  deferred_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  version: number;
}

interface Props {
  supabase: SupabaseClient;
  projectId: string;
  permissions: Set<string>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}

export function GovernanceGatesPanel({
  supabase,
  projectId,
  permissions,
  onError,
  onNotice
}: Props): JSX.Element {
  const [rows, setRows] = useState<GateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await supabase
      .from("governance_gates")
      .select(
        "id,gate_type,lifecycle,deferred_reason,deferred_by,deferred_at,approved_by,approved_at,version"
      )
      .eq("project_id", projectId);
    if (result.error) onError(result.error.message);
    else setRows((result.data ?? []) as GateRow[]);
    setLoading(false);
  }, [supabase, projectId, onError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function deferGate(event: FormEvent<HTMLFormElement>, row: GateRow): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await callRpc(
      supabase,
      "defer_gate",
      {
        target_gate_id: row.id,
        reason: form.get("reason"),
        expected_record_version: row.version
      },
      "Gate deferred. This stays visible app-wide until reconsidered."
    );
    if (!result.ok) onError(result.message);
    else {
      event.currentTarget.reset();
      onNotice(result.message);
      await refresh();
    }
  }

  async function reconsiderGate(row: GateRow): Promise<void> {
    const result = await callRpc(
      supabase,
      "reconsider_gate_deferral",
      { target_gate_id: row.id, expected_record_version: row.version },
      "Deferral reconsidered — gate is Open again."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function approveGate(row: GateRow): Promise<void> {
    const result = await callRpc(
      supabase,
      "approve_gate",
      { target_gate_id: row.id, expected_record_version: row.version },
      "Gate approved."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  return (
    <section className="panel">
      <h3>Governance Gates</h3>
      <p>
        Every gate here has an operator override: defer it at your own risk with a reason (logged,
        never auto-expires), or approve it formally if you hold the matching approver bundle. Assign
        approvers via Admin &rarr; grant a <code>gate_approver:&lt;gate_type&gt;</code> bundle by
        email.
      </p>
      {loading ? (
        <p>Loading gates…</p>
      ) : rows.length === 0 ? (
        <p>No governance gates for this Project.</p>
      ) : (
        <div className="work-list">
          {rows.map((row) => {
            const canOverride = permissions.has("governance.override_gate");
            const canApprove =
              permissions.has(`governance.approve_gate:${row.gate_type}`) &&
              row.lifecycle !== "Approved";
            return (
              <article key={row.id}>
                <div>
                  <span className="status-pill" data-status={row.lifecycle}>
                    {row.lifecycle}
                  </span>
                  <h4>{row.gate_type}</h4>
                  {row.lifecycle === "Deferred" && (
                    <div className="blocker-banner">
                      Deferred: {row.deferred_reason}
                      <small>
                        by {row.deferred_by} at{" "}
                        {row.deferred_at ? new Date(row.deferred_at).toLocaleString() : ""}
                      </small>
                    </div>
                  )}
                  {row.lifecycle === "Approved" && (
                    <div className="negotiation-banner">
                      Approved by {row.approved_by} at{" "}
                      {row.approved_at ? new Date(row.approved_at).toLocaleString() : ""}
                    </div>
                  )}
                </div>
                <div className="actions">
                  {row.lifecycle === "Open" && canOverride && (
                    <form className="create-form" onSubmit={(event) => void deferGate(event, row)}>
                      <label>
                        Reason for deferring (required)
                        <input name="reason" required />
                      </label>
                      <button type="submit">Defer at my own risk</button>
                    </form>
                  )}
                  {row.lifecycle === "Deferred" && canOverride && (
                    <button onClick={() => void reconsiderGate(row)}>
                      Reconsider (undo deferral)
                    </button>
                  )}
                  {canApprove && <button onClick={() => void approveGate(row)}>Approve</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
