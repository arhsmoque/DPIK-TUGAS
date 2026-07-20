import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callRpc } from "./rpc";

interface ReceiptEvidenceRow {
  id: string;
  dispatch_attempt_id: string;
  status: string;
  self_verified: boolean;
  version: number;
}

interface DeliveredDispatchOption {
  id: string;
  destination: string;
}

interface Props {
  supabase: SupabaseClient;
  projectId: string;
  permissions: Set<string>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}

export function ReceiptEvidencePanel({
  supabase,
  projectId,
  permissions,
  onError,
  onNotice
}: Props): JSX.Element {
  const [rows, setRows] = useState<ReceiptEvidenceRow[]>([]);
  const [deliveredDispatches, setDeliveredDispatches] = useState<DeliveredDispatchOption[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [evidenceResult, dispatchResult] = await Promise.all([
      supabase
        .from("receipt_evidence_attempts")
        .select("id,dispatch_attempt_id,status,self_verified,version")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("dispatch_attempts")
        .select("id,destination")
        .eq("project_id", projectId)
        .eq("status", "Delivered")
    ]);
    if (evidenceResult.error) onError(evidenceResult.error.message);
    else setRows((evidenceResult.data ?? []) as ReceiptEvidenceRow[]);
    if (dispatchResult.error) onError(dispatchResult.error.message);
    else setDeliveredDispatches((dispatchResult.data ?? []) as DeliveredDispatchOption[]);
    setLoading(false);
  }, [supabase, projectId, onError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createAttempt(): Promise<void> {
    if (deliveredDispatches.length === 0) {
      onError("No Delivered dispatch attempt to attach evidence to yet.");
      return;
    }
    const dispatchAttemptId = window.prompt(
      `Dispatch Attempt ID (options: ${deliveredDispatches.map((d) => `${d.destination}=${d.id}`).join(", ")}):`
    );
    if (!dispatchAttemptId) return;
    const result = await callRpc(
      supabase,
      "create_receipt_evidence_attempt",
      { target_dispatch_attempt_id: dispatchAttemptId, replaces_receipt_evidence_attempt_id: null },
      "Receipt evidence attempt created."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function uploadItem(row: ReceiptEvidenceRow): Promise<void> {
    const fileReference = window.prompt("File reference (storage path or URL):");
    if (!fileReference) return;
    const description = window.prompt("Description (e.g. 'Stamped acknowledgement'):");
    if (!description) return;
    const result = await callRpc(
      supabase,
      "upload_receipt_evidence_item",
      {
        target_receipt_evidence_attempt_id: row.id,
        file_reference: fileReference,
        description,
        expected_record_version: row.version
      },
      "Evidence item uploaded."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function submit(row: ReceiptEvidenceRow): Promise<void> {
    const result = await callRpc(
      supabase,
      "submit_receipt_evidence_for_verification",
      { target_receipt_evidence_attempt_id: row.id, expected_record_version: row.version },
      "Submitted for verification."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function verify(row: ReceiptEvidenceRow): Promise<void> {
    const notes = window.prompt("Verification notes:");
    if (!notes) return;
    const selfVerified = window.confirm(
      "Are you also the uploader of this evidence? (OK = yes, self-verify)"
    );
    const result = await callRpc(
      supabase,
      "verify_receipt_evidence",
      {
        target_receipt_evidence_attempt_id: row.id,
        notes,
        self_verified: selfVerified,
        expected_record_version: row.version
      },
      "Evidence verified."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function reject(row: ReceiptEvidenceRow): Promise<void> {
    const reason = window.prompt("Rejection reason:");
    if (!reason) return;
    const result = await callRpc(
      supabase,
      "reject_receipt_evidence",
      { target_receipt_evidence_attempt_id: row.id, reason, expected_record_version: row.version },
      "Evidence rejected."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  return (
    <section className="panel">
      <h3>Receipt Evidence</h3>
      {permissions.has("receipt.upload") && (
        <button onClick={() => void createAttempt()}>New evidence attempt</button>
      )}
      {loading ? (
        <p>Loading receipt evidence…</p>
      ) : rows.length === 0 ? (
        <p>No receipt evidence attempts yet.</p>
      ) : (
        <div className="work-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <span className="status-pill" data-status={row.status}>
                  {row.status}
                </span>
                <h4>Attempt {row.id.slice(0, 8)}</h4>
                {row.self_verified && <small>Self-verified (no second person available)</small>}
              </div>
              <div className="actions">
                {row.status === "Collecting" && permissions.has("receipt.upload") && (
                  <>
                    <button onClick={() => void uploadItem(row)}>Upload item</button>
                    <button onClick={() => void submit(row)}>Submit for verification</button>
                  </>
                )}
                {row.status === "PendingVerification" && permissions.has("receipt.verify") && (
                  <button onClick={() => void verify(row)}>Verify</button>
                )}
                {row.status === "PendingVerification" && permissions.has("receipt.reject") && (
                  <button className="secondary" onClick={() => void reject(row)}>
                    Reject
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
