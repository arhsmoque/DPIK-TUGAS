import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callRpc } from "./rpc";

interface SubmissionRow {
  id: string;
  reference: string;
  recipient_type: "client" | "authority";
  recipient_name: string;
  package_summary: string;
  status: string;
  version: number;
}

interface Props {
  supabase: SupabaseClient;
  projectId: string;
  permissions: Set<string>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}

export function SubmissionsPanel({
  supabase,
  projectId,
  permissions,
  onError,
  onNotice
}: Props): JSX.Element {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await supabase
      .from("submissions")
      .select("id,reference,recipient_type,recipient_name,package_summary,status,version")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (result.error) onError(result.error.message);
    else setRows((result.data ?? []) as SubmissionRow[]);
    setLoading(false);
  }, [supabase, projectId, onError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createSubmission(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await callRpc(
      supabase,
      "create_submission",
      {
        target_project_id: projectId,
        submission_reference: form.get("reference"),
        submission_recipient_type: form.get("recipientType"),
        submission_recipient_name: form.get("recipientName"),
        submission_package_summary: form.get("packageSummary")
      },
      "Submission created."
    );
    if (!result.ok) onError(result.message);
    else {
      event.currentTarget.reset();
      onNotice(result.message);
      await refresh();
    }
  }

  async function addManifestItem(row: SubmissionRow): Promise<void> {
    const deliverableId = window.prompt("Deliverable ID:");
    if (!deliverableId) return;
    const revisionId = window.prompt("Approved Revision ID:");
    if (!revisionId) return;
    const result = await callRpc(
      supabase,
      "add_manifest_item",
      {
        target_submission_id: row.id,
        target_deliverable_id: deliverableId,
        target_revision_id: revisionId,
        expected_record_version: row.version
      },
      "Manifest item added."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function prepare(row: SubmissionRow): Promise<void> {
    const result = await callRpc(
      supabase,
      "prepare_submission",
      { target_submission_id: row.id, expected_record_version: row.version },
      "Submission prepared."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function approveForDispatch(row: SubmissionRow): Promise<void> {
    const credential = window.prompt(
      "Authorized Signatory credential reference (e.g. PEPC 12345):"
    );
    if (!credential) return;
    const result = await callRpc(
      supabase,
      "approve_submission_for_dispatch",
      {
        target_submission_id: row.id,
        credential_reference: credential,
        expected_record_version: row.version
      },
      "Approved for dispatch."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function cancel(row: SubmissionRow): Promise<void> {
    const reason = window.prompt("Reason for cancelling:");
    if (!reason) return;
    const result = await callRpc(
      supabase,
      "cancel_submission",
      { target_submission_id: row.id, reason, expected_record_version: row.version },
      "Submission cancelled."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  return (
    <section className="panel">
      <h3>Submissions</h3>
      {permissions.has("submission.prepare") && (
        <form className="create-form" onSubmit={(event) => void createSubmission(event)}>
          <label>
            Reference
            <input name="reference" required />
          </label>
          <label>
            Recipient type
            <select name="recipientType" defaultValue="authority">
              <option value="authority">Authority</option>
              <option value="client">Client</option>
            </select>
          </label>
          <label>
            Recipient name
            <input name="recipientName" required />
          </label>
          <label>
            Package summary
            <input name="packageSummary" required />
          </label>
          <button type="submit">Create</button>
        </form>
      )}
      {loading ? (
        <p>Loading submissions…</p>
      ) : rows.length === 0 ? (
        <p>No submissions yet.</p>
      ) : (
        <div className="work-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <span className="status-pill" data-status={row.status}>
                  {row.status}
                </span>
                <h4>{row.reference}</h4>
                <p>
                  {row.recipient_type} — {row.recipient_name}
                </p>
                <small>{row.package_summary}</small>
              </div>
              <div className="actions">
                {row.status === "Draft" && permissions.has("submission.prepare") && (
                  <>
                    <button onClick={() => void addManifestItem(row)}>Add manifest item</button>
                    <button onClick={() => void prepare(row)}>Prepare</button>
                  </>
                )}
                {row.status === "Prepared" && permissions.has("submission.approve_dispatch") && (
                  <button onClick={() => void approveForDispatch(row)}>Approve for dispatch</button>
                )}
                {(row.status === "Draft" ||
                  row.status === "Prepared" ||
                  row.status === "ReadyForDispatch") &&
                  permissions.has("submission.cancel") && (
                    <button className="secondary" onClick={() => void cancel(row)}>
                      Cancel
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
