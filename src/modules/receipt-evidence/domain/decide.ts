import { err, ok, type Result } from "@foundation/result";
import type {
  CreateReceiptEvidenceAttempt,
  CreateReplacementReceiptEvidenceAttempt,
  InvalidateReceiptEvidenceVerification,
  ReceiptEvidenceCommand,
  RejectReceiptEvidence,
  SubmitReceiptEvidenceForVerification,
  UploadReceiptEvidenceItem,
  VerifyReceiptEvidence,
  WithdrawReceiptEvidence
} from "./commands";
import type { ReceiptEvidenceEvent } from "./events";
import type { ReceiptEvidenceDecisionFailure } from "./failures";
import type { ReceiptEvidenceState } from "./receipt-evidence";

type Decision = Result<readonly ReceiptEvidenceEvent[], ReceiptEvidenceDecisionFailure>;

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function decideCreate(
  state: ReceiptEvidenceState | null,
  command: CreateReceiptEvidenceAttempt
): Decision {
  if (state !== null) return err({ type: "receipt_evidence_already_exists" });
  if (!isValidDate(command.createdAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ReceiptEvidenceAttemptCreated",
      receiptEvidenceAttemptId: command.receiptEvidenceAttemptId,
      dispatchAttemptId: command.dispatchAttemptId,
      organisationId: command.organisationId,
      projectId: command.projectId,
      replacesReceiptEvidenceAttemptId: null,
      createdBy: command.createdBy,
      createdAt: command.createdAt
    }
  ]);
}

function decideCreateReplacement(
  state: ReceiptEvidenceState | null,
  command: CreateReplacementReceiptEvidenceAttempt
): Decision {
  if (state !== null) return err({ type: "receipt_evidence_already_exists" });
  if (!isValidDate(command.createdAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ReplacementReceiptEvidenceCreated",
      receiptEvidenceAttemptId: command.receiptEvidenceAttemptId,
      dispatchAttemptId: command.dispatchAttemptId,
      organisationId: command.organisationId,
      projectId: command.projectId,
      replacesReceiptEvidenceAttemptId: command.replacesReceiptEvidenceAttemptId,
      createdBy: command.createdBy,
      createdAt: command.createdAt
    }
  ]);
}

function decideUpload(
  state: ReceiptEvidenceState | null,
  command: UploadReceiptEvidenceItem
): Decision {
  if (state === null) return err({ type: "receipt_evidence_not_found" });
  if (state.status !== "Collecting") {
    return err({ type: "receipt_evidence_not_collecting", status: state.status });
  }
  if (!hasText(command.fileReference) || !hasText(command.description)) {
    return err({ type: "invalid_evidence_item" });
  }
  if (!isValidDate(command.uploadedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ReceiptEvidenceItemUploaded",
      fileReference: command.fileReference.trim(),
      description: command.description.trim(),
      uploadedBy: command.uploadedBy,
      uploadedAt: command.uploadedAt
    }
  ]);
}

function decideSubmit(
  state: ReceiptEvidenceState | null,
  command: SubmitReceiptEvidenceForVerification
): Decision {
  if (state === null) return err({ type: "receipt_evidence_not_found" });
  if (state.status !== "Collecting") {
    return err({ type: "receipt_evidence_not_collecting", status: state.status });
  }
  if (state.items.length === 0) return err({ type: "empty_evidence" });
  if (!isValidDate(command.submittedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ReceiptEvidenceSubmittedForVerification",
      submittedBy: command.submittedBy,
      submittedAt: command.submittedAt
    }
  ]);
}

function decideVerify(
  state: ReceiptEvidenceState | null,
  command: VerifyReceiptEvidence
): Decision {
  if (state === null) return err({ type: "receipt_evidence_not_found" });
  if (state.status !== "PendingVerification") {
    return err({ type: "receipt_evidence_not_pending_verification", status: state.status });
  }
  const verifierUploaded = state.items.some((item) => item.uploadedBy === command.verifiedBy);
  if (verifierUploaded && !command.selfVerified) {
    return err({ type: "verifier_is_only_uploader_without_self_verified_flag" });
  }
  if (!hasText(command.notes)) return err({ type: "invalid_verification_notes" });
  if (!isValidDate(command.verifiedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ReceiptEvidenceVerified",
      verifiedBy: command.verifiedBy,
      verifiedAt: command.verifiedAt,
      notes: command.notes.trim(),
      selfVerified: command.selfVerified
    }
  ]);
}

function decideReject(
  state: ReceiptEvidenceState | null,
  command: RejectReceiptEvidence
): Decision {
  if (state === null) return err({ type: "receipt_evidence_not_found" });
  if (state.status !== "PendingVerification") {
    return err({ type: "receipt_evidence_not_pending_verification", status: state.status });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.rejectedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ReceiptEvidenceRejected",
      rejectedBy: command.rejectedBy,
      rejectedAt: command.rejectedAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideWithdraw(
  state: ReceiptEvidenceState | null,
  command: WithdrawReceiptEvidence
): Decision {
  if (state === null) return err({ type: "receipt_evidence_not_found" });
  if (state.status !== "Collecting" && state.status !== "PendingVerification") {
    return err({ type: "receipt_evidence_not_withdrawable", status: state.status });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.withdrawnAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ReceiptEvidenceWithdrawn",
      withdrawnBy: command.withdrawnBy,
      withdrawnAt: command.withdrawnAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideInvalidate(
  state: ReceiptEvidenceState | null,
  command: InvalidateReceiptEvidenceVerification
): Decision {
  if (state === null) return err({ type: "receipt_evidence_not_found" });
  if (state.status !== "Verified") {
    return err({ type: "receipt_evidence_not_verified", status: state.status });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.invalidatedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ReceiptEvidenceVerificationInvalidated",
      invalidatedBy: command.invalidatedBy,
      invalidatedAt: command.invalidatedAt,
      reason: command.reason.trim()
    }
  ]);
}

export function decide(
  state: ReceiptEvidenceState | null,
  command: ReceiptEvidenceCommand
): Decision {
  switch (command.type) {
    case "CreateReceiptEvidenceAttempt":
      return decideCreate(state, command);
    case "CreateReplacementReceiptEvidenceAttempt":
      return decideCreateReplacement(state, command);
    case "UploadReceiptEvidenceItem":
      return decideUpload(state, command);
    case "SubmitReceiptEvidenceForVerification":
      return decideSubmit(state, command);
    case "VerifyReceiptEvidence":
      return decideVerify(state, command);
    case "RejectReceiptEvidence":
      return decideReject(state, command);
    case "WithdrawReceiptEvidence":
      return decideWithdraw(state, command);
    case "InvalidateReceiptEvidenceVerification":
      return decideInvalidate(state, command);
  }
}
