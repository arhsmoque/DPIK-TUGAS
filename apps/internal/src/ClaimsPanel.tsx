import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callRpc } from "./rpc";

interface ClaimRow {
  id: string;
  reference: string;
  description: string;
  lifecycle: string;
  readiness: string;
  version: number;
}

interface RequirementRow {
  id: string;
  claim_package_id: string;
  description: string;
  status: string;
}

interface Props {
  supabase: SupabaseClient;
  projectId: string;
  permissions: Set<string>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}

export function ClaimsPanel({
  supabase,
  projectId,
  permissions,
  onError,
  onNotice
}: Props): JSX.Element {
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [requirements, setRequirements] = useState<Record<string, RequirementRow[]>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const claimResult = await supabase
      .from("claim_packages")
      .select("id,reference,description,lifecycle,readiness,version")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (claimResult.error) {
      onError(claimResult.error.message);
      setLoading(false);
      return;
    }
    const claims = (claimResult.data ?? []) as ClaimRow[];
    setRows(claims);

    const requirementResult = await supabase
      .from("claim_requirements")
      .select("id,claim_package_id,description,status")
      .in(
        "claim_package_id",
        claims.map((c) => c.id).length > 0
          ? claims.map((c) => c.id)
          : ["00000000-0000-0000-0000-000000000000"]
      );
    if (requirementResult.error) onError(requirementResult.error.message);
    else {
      const grouped: Record<string, RequirementRow[]> = {};
      for (const req of (requirementResult.data ?? []) as RequirementRow[]) {
        (grouped[req.claim_package_id] ??= []).push(req);
      }
      setRequirements(grouped);
    }
    setLoading(false);
  }, [supabase, projectId, onError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createClaim(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await callRpc(
      supabase,
      "create_claim_package",
      {
        target_project_id: projectId,
        claim_reference: form.get("reference"),
        claim_description: form.get("description")
      },
      "Claim package created."
    );
    if (!result.ok) onError(result.message);
    else {
      event.currentTarget.reset();
      onNotice(result.message);
      await refresh();
    }
  }

  async function addRequirement(row: ClaimRow): Promise<void> {
    const description = window.prompt("Requirement description:");
    if (!description) return;
    const result = await callRpc(
      supabase,
      "add_claim_requirement",
      {
        target_claim_package_id: row.id,
        requirement_description: description,
        expected_record_version: row.version
      },
      "Requirement added."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function evaluateRequirement(requirement: RequirementRow, claim: ClaimRow): Promise<void> {
    const outcome = window.prompt("Outcome: satisfied / gap", "satisfied");
    if (!outcome) return;
    const notes = window.prompt("Notes:");
    if (!notes) return;
    const result = await callRpc(
      supabase,
      "evaluate_claim_requirement",
      {
        target_requirement_id: requirement.id,
        outcome,
        notes,
        expected_record_version: claim.version
      },
      "Requirement evaluated."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function requestWaiver(requirement: RequirementRow): Promise<void> {
    const reason = window.prompt("Waiver reason:");
    if (!reason) return;
    const result = await callRpc(
      supabase,
      "request_claim_requirement_waiver",
      { target_requirement_id: requirement.id, reason },
      "Waiver requested."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function approveWaiver(requirement: RequirementRow, claim: ClaimRow): Promise<void> {
    const result = await callRpc(
      supabase,
      "approve_claim_requirement_waiver",
      { target_requirement_id: requirement.id, expected_record_version: claim.version },
      "Waiver approved."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function verifyClaim(row: ClaimRow): Promise<void> {
    const notes = window.prompt("QS verification notes:");
    if (!notes) return;
    const result = await callRpc(
      supabase,
      "verify_claim_package",
      { target_claim_package_id: row.id, notes, expected_record_version: row.version },
      "Claim QS-verified."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  async function recordSubmission(row: ClaimRow): Promise<void> {
    const result = await callRpc(
      supabase,
      "record_claim_submission",
      { target_claim_package_id: row.id, expected_record_version: row.version },
      "Claim submitted."
    );
    if (!result.ok) onError(result.message);
    else {
      onNotice(result.message);
      await refresh();
    }
  }

  return (
    <section className="panel">
      <h3>Claims</h3>
      {permissions.has("claim.create") && (
        <form className="create-form" onSubmit={(event) => void createClaim(event)}>
          <label>
            Reference
            <input name="reference" required />
          </label>
          <label>
            Description
            <input name="description" required />
          </label>
          <button type="submit">Create</button>
        </form>
      )}
      {loading ? (
        <p>Loading claims…</p>
      ) : rows.length === 0 ? (
        <p>No claim packages yet.</p>
      ) : (
        <div className="work-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <span className="status-pill" data-status={row.readiness}>
                  {row.readiness}
                </span>{" "}
                <span className="badge">{row.lifecycle}</span>
                <h4>{row.reference}</h4>
                <p>{row.description}</p>
                {(requirements[row.id] ?? []).map((requirement) => (
                  <div
                    key={requirement.id}
                    className="blocker-banner"
                    style={{
                      borderLeftColor: "var(--btn-bg)",
                      background: "var(--active-bg)",
                      color: "var(--active-text)"
                    }}
                  >
                    {requirement.description} — {requirement.status}
                    {requirement.status === "Unsatisfied" && permissions.has("claim.evaluate") && (
                      <div className="actions" style={{ marginTop: 6 }}>
                        <button onClick={() => void evaluateRequirement(requirement, row)}>
                          Evaluate
                        </button>
                        {permissions.has("claim.waive_requirement") && (
                          <button
                            className="secondary"
                            onClick={() => void requestWaiver(requirement)}
                          >
                            Request waiver
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="actions">
                {row.lifecycle === "Open" && permissions.has("claim.configure_requirements") && (
                  <button onClick={() => void addRequirement(row)}>Add requirement</button>
                )}
                {(requirements[row.id] ?? []).some((r) => r.status === "Unsatisfied") &&
                  permissions.has("claim.waive_requirement") && (
                    <button
                      className="secondary"
                      onClick={() => {
                        const pending = (requirements[row.id] ?? []).find(
                          (r) => r.status === "Unsatisfied"
                        );
                        if (pending) void approveWaiver(pending, row);
                      }}
                    >
                      Approve pending waiver
                    </button>
                  )}
                {row.readiness === "ReadyForQSReview" && permissions.has("claim.verify") && (
                  <button onClick={() => void verifyClaim(row)}>QS verify</button>
                )}
                {row.readiness === "QSVerified" &&
                  row.lifecycle === "Open" &&
                  permissions.has("claim.submit") && (
                    <button onClick={() => void recordSubmission(row)}>Record submission</button>
                  )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
