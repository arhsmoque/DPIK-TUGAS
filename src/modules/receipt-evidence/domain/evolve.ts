import { err, ok, type Result } from "@foundation/result";
import type { ReceiptEvidenceEvent } from "./events";
import type { ReceiptEvidenceEvolutionFailure } from "./failures";
import type { ReceiptEvidenceState } from "./receipt-evidence";

export function evolve(
  state: ReceiptEvidenceState | null,
  event: ReceiptEvidenceEvent
): Result<ReceiptEvidenceState, ReceiptEvidenceEvolutionFailure> {
  switch (event.type) {
    case "ReceiptEvidenceAttemptCreated":
    case "ReplacementReceiptEvidenceCreated": {
      if (state !== null) return err({ type: "event_requires_empty_state", eventType: event.type });
      return ok({
        facts: {
          receiptEvidenceAttemptId: event.receiptEvidenceAttemptId,
          dispatchAttemptId: event.dispatchAttemptId,
          organisationId: event.organisationId,
          projectId: event.projectId,
          replacesReceiptEvidenceAttemptId: event.replacesReceiptEvidenceAttemptId,
          createdBy: event.createdBy,
          createdAt: event.createdAt
        },
        status: "Collecting",
        items: [],
        verification: null,
        rejectionReason: null
      });
    }

    case "ReceiptEvidenceItemUploaded": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Collecting") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({
        ...state,
        items: [
          ...state.items,
          {
            fileReference: event.fileReference,
            description: event.description,
            uploadedBy: event.uploadedBy,
            uploadedAt: event.uploadedAt
          }
        ]
      });
    }

    case "ReceiptEvidenceSubmittedForVerification": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Collecting") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({ ...state, status: "PendingVerification" });
    }

    case "ReceiptEvidenceVerified": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "PendingVerification") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({
        ...state,
        status: "Verified",
        verification: {
          verifiedBy: event.verifiedBy,
          verifiedAt: event.verifiedAt,
          notes: event.notes,
          selfVerified: event.selfVerified
        }
      });
    }

    case "ReceiptEvidenceRejected": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "PendingVerification") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({ ...state, status: "Rejected", rejectionReason: event.reason });
    }

    case "ReceiptEvidenceWithdrawn": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Collecting" && state.status !== "PendingVerification") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({ ...state, status: "Withdrawn" });
    }

    case "ReceiptEvidenceVerificationInvalidated": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Verified") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({ ...state, status: "Invalidated" });
    }
  }
}
