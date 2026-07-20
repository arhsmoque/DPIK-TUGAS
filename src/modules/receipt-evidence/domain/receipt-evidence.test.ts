import { describe, expect, it } from "vitest";
import {
  brand,
  type ActorId,
  type DispatchAttemptId,
  type OrganisationId,
  type ProjectId,
  type ReceiptEvidenceAttemptId
} from "@foundation/index";
import type { CreateReceiptEvidenceAttempt, ReceiptEvidenceCommand } from "./commands";
import { decide } from "./decide";
import { evolve } from "./evolve";
import type { ReceiptEvidenceState } from "./receipt-evidence";

const receiptEvidenceAttemptId = brand<string, "ReceiptEvidenceAttemptId">(
  "00000000-0000-4000-8000-000000000600"
) as ReceiptEvidenceAttemptId;
const replacementId = brand<string, "ReceiptEvidenceAttemptId">(
  "00000000-0000-4000-8000-000000000601"
) as ReceiptEvidenceAttemptId;
const dispatchAttemptId = brand<string, "DispatchAttemptId">(
  "00000000-0000-4000-8000-000000000500"
) as DispatchAttemptId;
const organisationId = brand<string, "OrganisationId">(
  "00000000-0000-4000-8000-000000000010"
) as OrganisationId;
const projectId = brand<string, "ProjectId">("00000000-0000-4000-8000-000000000020") as ProjectId;
const uploaderId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000007") as ActorId;
const verifierId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000008") as ActorId;

const createCommand: CreateReceiptEvidenceAttempt = {
  type: "CreateReceiptEvidenceAttempt",
  receiptEvidenceAttemptId,
  dispatchAttemptId,
  organisationId,
  projectId,
  createdBy: uploaderId,
  createdAt: new Date("2026-07-19T12:00:00.000Z")
};

function apply(
  state: ReceiptEvidenceState | null,
  command: ReceiptEvidenceCommand
): ReceiptEvidenceState {
  const decision = decide(state, command);
  if (!decision.ok) throw new Error(`fixture decision failed: ${JSON.stringify(decision.error)}`);
  let next = state;
  for (const event of decision.value) {
    const evolved = evolve(next, event);
    if (!evolved.ok) throw new Error(`fixture evolution failed: ${JSON.stringify(evolved.error)}`);
    next = evolved.value;
  }
  return next as ReceiptEvidenceState;
}

function collectingWithItemState(): ReceiptEvidenceState {
  const created = apply(null, createCommand);
  return apply(created, {
    type: "UploadReceiptEvidenceItem",
    fileReference: "storage://receipt-photo-1.jpg",
    description: "Stamped acknowledgement from JKR document control",
    uploadedBy: uploaderId,
    uploadedAt: new Date("2026-07-19T12:30:00.000Z")
  });
}

function pendingVerificationState(): ReceiptEvidenceState {
  return apply(collectingWithItemState(), {
    type: "SubmitReceiptEvidenceForVerification",
    submittedBy: uploaderId,
    submittedAt: new Date("2026-07-19T13:00:00.000Z")
  });
}

describe("RE-01/02 create and upload", () => {
  it("stays Collecting across multiple uploads", () => {
    const state = collectingWithItemState();
    expect(state.status).toBe("Collecting");
    expect(state.items).toHaveLength(1);
  });

  it("refuses submission with no items", () => {
    const created = apply(null, createCommand);
    expect(
      decide(created, {
        type: "SubmitReceiptEvidenceForVerification",
        submittedBy: uploaderId,
        submittedAt: new Date()
      })
    ).toEqual({ ok: false, error: { type: "empty_evidence" } });
  });
});

describe("RE-05 VerifyReceiptEvidence separation of duty", () => {
  it("refuses an uploader verifying their own evidence without the flag", () => {
    expect(
      decide(pendingVerificationState(), {
        type: "VerifyReceiptEvidence",
        verifiedBy: uploaderId,
        verifiedAt: new Date("2026-07-19T14:00:00.000Z"),
        notes: "Looks fine",
        selfVerified: false
      })
    ).toEqual({
      ok: false,
      error: { type: "verifier_is_only_uploader_without_self_verified_flag" }
    });
  });

  it("allows an independent verifier", () => {
    const verified = apply(pendingVerificationState(), {
      type: "VerifyReceiptEvidence",
      verifiedBy: verifierId,
      verifiedAt: new Date("2026-07-19T14:00:00.000Z"),
      notes: "Stamp and date confirmed",
      selfVerified: false
    });
    expect(verified.status).toBe("Verified");
    expect(verified.verification?.selfVerified).toBe(false);
  });

  it("allows the uploader to self-verify only when explicitly flagged, and records it visibly", () => {
    const verified = apply(pendingVerificationState(), {
      type: "VerifyReceiptEvidence",
      verifiedBy: uploaderId,
      verifiedAt: new Date("2026-07-19T14:00:00.000Z"),
      notes: "No second person available today",
      selfVerified: true
    });
    expect(verified.verification).toEqual(
      expect.objectContaining({ verifiedBy: uploaderId, selfVerified: true })
    );
  });
});

describe("RE-06/07/08/09 rejection, withdrawal, invalidation, replacement", () => {
  it("rejects with a reason and never satisfies afterward", () => {
    const rejected = apply(pendingVerificationState(), {
      type: "RejectReceiptEvidence",
      rejectedBy: verifierId,
      rejectedAt: new Date("2026-07-19T14:00:00.000Z"),
      reason: "Stamp illegible"
    });
    expect(rejected.status).toBe("Rejected");
    expect(rejected.rejectionReason).toBe("Stamp illegible");
  });

  it("invalidates a prior verification only from Verified", () => {
    const verified = apply(pendingVerificationState(), {
      type: "VerifyReceiptEvidence",
      verifiedBy: verifierId,
      verifiedAt: new Date("2026-07-19T14:00:00.000Z"),
      notes: "Confirmed",
      selfVerified: false
    });
    const invalidated = apply(verified, {
      type: "InvalidateReceiptEvidenceVerification",
      invalidatedBy: verifierId,
      invalidatedAt: new Date("2026-07-20T09:00:00.000Z"),
      reason: "Later found to reference the wrong package"
    });
    expect(invalidated.status).toBe("Invalidated");

    expect(
      decide(collectingWithItemState(), {
        type: "InvalidateReceiptEvidenceVerification",
        invalidatedBy: verifierId,
        invalidatedAt: new Date(),
        reason: "attempt"
      })
    ).toEqual({
      ok: false,
      error: { type: "receipt_evidence_not_verified", status: "Collecting" }
    });
  });

  it("creates a replacement attempt linked to the rejected one", () => {
    const replacement = apply(null, {
      type: "CreateReplacementReceiptEvidenceAttempt",
      receiptEvidenceAttemptId: replacementId,
      dispatchAttemptId,
      organisationId,
      projectId,
      replacesReceiptEvidenceAttemptId: receiptEvidenceAttemptId,
      createdBy: uploaderId,
      createdAt: new Date("2026-07-20T10:00:00.000Z")
    });
    expect(replacement.status).toBe("Collecting");
    expect(replacement.facts.replacesReceiptEvidenceAttemptId).toBe(receiptEvidenceAttemptId);
  });
});
