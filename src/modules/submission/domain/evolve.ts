import { err, ok, type Result } from "@foundation/result";
import type { SubmissionEvent } from "./events";
import type { SubmissionEvolutionFailure } from "./failures";
import type { SubmissionState } from "./submission";

export function evolve(
  state: SubmissionState | null,
  event: SubmissionEvent
): Result<SubmissionState, SubmissionEvolutionFailure> {
  switch (event.type) {
    case "SubmissionCreated": {
      if (state !== null) return err({ type: "event_requires_empty_state", eventType: event.type });
      return ok({
        facts: {
          submissionId: event.submissionId,
          organisationId: event.organisationId,
          projectId: event.projectId,
          reference: event.reference,
          recipientType: event.recipientType,
          recipientName: event.recipientName,
          packageSummary: event.packageSummary,
          createdBy: event.createdBy,
          createdAt: event.createdAt
        },
        status: "Draft",
        manifest: [],
        dispatchApproval: null,
        supersededBySubmissionId: null
      });
    }

    case "SubmissionManifestItemAdded": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Draft") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({
        ...state,
        manifest: [
          ...state.manifest,
          {
            deliverableId: event.deliverableId,
            revisionId: event.revisionId,
            label: event.label,
            repositoryReference: event.repositoryReference,
            addedBy: event.addedBy,
            addedAt: event.addedAt
          }
        ]
      });
    }

    case "SubmissionPrepared": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Draft") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({ ...state, status: "Prepared" });
    }

    case "SubmissionReturnedToDraft": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Prepared") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({ ...state, status: "Draft" });
    }

    case "SubmissionApprovedForDispatch": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Prepared") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({
        ...state,
        status: "ReadyForDispatch",
        dispatchApproval: {
          approvedBy: event.approvedBy,
          approvedAt: event.approvedAt,
          credentialReference: event.credentialReference
        }
      });
    }

    case "SubmissionCancelled": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status === "Cancelled" || state.status === "Superseded") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({ ...state, status: "Cancelled" });
    }

    case "SubmissionSuperseded": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Prepared" && state.status !== "ReadyForDispatch") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({
        ...state,
        status: "Superseded",
        supersededBySubmissionId: event.replacementSubmissionId
      });
    }
  }
}
