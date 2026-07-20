import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callRpc } from "./rpc";

interface DispatchRow {
  id: string;
  submission_id: string;
  destination: string;
  recipient_contact: string;
  status: string;
  custodian_name: string | null;
  version: number;
}

interface SubmissionOption {
  id: string;
  reference: string;
}

interface Props {
  supabase: SupabaseClient;
  projectId: string;
  permissions: Set<string>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}

export function DispatchPanel({
  supabase,
  projectId,
  permissions,
  onError,
  onNotice
}: Props): JSX.Element {
  const [rows, setRows] = useState<DispatchRow[]>([]);
  const [readySubmissions, setReadySubmissions] = useState<SubmissionOption[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [dispatchResult, submissionResult] = await Promise.all([
      supabase
        .from("dispatch_attempts")
        .select("id,submission_id,destination,recipient_contact,status,custodian_name,version")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("submissions")
        .select("id,reference")
        .eq("project_id", projectId)
        .eq("status", "ReadyForDispatch")
    ]);
    if (dispatchResult.error) onError(dispatchResult.error.message);
    else setRows((dispatchResult.data ?? []) as DispatchRow[]);
    if (submissionResult.error) onError(submissionResult.error.message);
    else setReadySubmissions((submissionResult.data ?? []) as SubmissionOption[]);
    setLoading(false);
  }, [supabase, projectId, onError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createDispatch(): Promise<void> {
    if (readySubmissions.length === 0) {
      onError("No submission is ReadyForDispatch yet.");
      return;
    }
    const submissionId = window.prompt(
      `Submission ID to dispatch (options: ${readySubmissions.map((s) => `${s.reference}=${s.id}`).join(", ")}):`
    );
    if (!submissionId) return;
    const destination = window.prompt("Destination:");
    if (!destination) return;
    const recipientContact = window.prompt("Recipient contact:");
    if (!recipientContact) return;
    const packageSummary = window.prompt("Package summary:");
    if (!packageSummary) return;
    const result = await callRpc(
      supabase,
      "create_dispatch_attempt",
      {
        target_submission_id: submissionId,
        destination,
        recipient_contact: recipientContact,
        package_summary: packageSummary,
        replaces_dispatch_attempt_id: null
      },
      "Dispatch attempt created."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function assign(row: DispatchRow): Promise<void> {
    const custodianType = window.prompt("Custodian type: internal / external", "external");
    if (!custodianType) return;
    const custodianEmail =
      custodianType === "internal" ? (window.prompt("Custodian email:") ?? "") : "";
    const custodianName = window.prompt("Custodian name:");
    if (!custodianName) return;
    const result = await callRpc(
      supabase,
      "assign_dispatch",
      {
        target_dispatch_attempt_id: row.id,
        custodian_type: custodianType,
        custodian_email: custodianEmail,
        custodian_name: custodianName,
        expected_record_version: row.version
      },
      "Dispatch assigned."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function confirmCollection(row: DispatchRow): Promise<void> {
    const result = await callRpc(
      supabase,
      "confirm_package_collection",
      { target_dispatch_attempt_id: row.id, expected_record_version: row.version },
      "Collection confirmed."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function reportDelivery(row: DispatchRow): Promise<void> {
    const deliveredTo = window.prompt("Delivered to:");
    if (!deliveredTo) return;
    const result = await callRpc(
      supabase,
      "report_package_delivery",
      {
        target_dispatch_attempt_id: row.id,
        delivered_to: deliveredTo,
        expected_record_version: row.version
      },
      "Delivery reported."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function reportFailure(row: DispatchRow): Promise<void> {
    const reason = window.prompt("Failure reason:");
    if (!reason) return;
    const result = await callRpc(
      supabase,
      "report_delivery_failure",
      { target_dispatch_attempt_id: row.id, reason, expected_record_version: row.version },
      "Failure reported."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  return (
    <section className="panel">
      <h3>Dispatch</h3>
      {permissions.has("dispatch.create") && (
        <button onClick={() => void createDispatch()}>New dispatch attempt</button>
      )}
      {loading ? (
        <p>Loading dispatch attempts…</p>
      ) : rows.length === 0 ? (
        <p>No dispatch attempts yet.</p>
      ) : (
        <div className="work-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <span className="status-pill" data-status={row.status}>
                  {row.status}
                </span>
                <h4>{row.destination}</h4>
                <p>{row.recipient_contact}</p>
                {row.custodian_name && <small>Custodian: {row.custodian_name}</small>}
              </div>
              <div className="actions">
                {row.status === "Prepared" && permissions.has("dispatch.assign") && (
                  <button onClick={() => void assign(row)}>Assign custodian</button>
                )}
                {row.status === "Assigned" && permissions.has("dispatch.report_collection") && (
                  <button onClick={() => void confirmCollection(row)}>Confirm collection</button>
                )}
                {row.status === "InTransit" && permissions.has("dispatch.report_delivery") && (
                  <button onClick={() => void reportDelivery(row)}>Report delivery</button>
                )}
                {(row.status === "Assigned" || row.status === "InTransit") &&
                  permissions.has("dispatch.report_failure") && (
                    <button className="secondary" onClick={() => void reportFailure(row)}>
                      Report failure
                    </button>
                  )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
