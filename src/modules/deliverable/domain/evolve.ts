import { err, ok, type Result } from "@foundation/result";
import type { DeliverableState } from "./deliverable";
import type { DeliverableEvent } from "./events";
import type { DeliverableEvolutionFailure } from "./failures";

export function evolve(
  state: DeliverableState | null,
  event: DeliverableEvent
): Result<DeliverableState, DeliverableEvolutionFailure> {
  switch (event.type) {
    case "DeliverableCreated": {
      if (state !== null) {
        return err({ type: "event_requires_empty_state", eventType: event.type });
      }
      return ok({
        facts: {
          deliverableId: event.deliverableId,
          workThreadId: event.workThreadId,
          organisationId: event.organisationId,
          projectId: event.projectId,
          title: event.title,
          createdBy: event.createdBy,
          createdAt: event.createdAt
        },
        status: "Draft",
        revisions: [],
        currentRevisionId: null,
        lastReview: null
      });
    }

    case "RevisionSubmitted": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Draft" && state.status !== "RevisionRequired") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      const supersededRevisions = state.revisions.map((revision) =>
        revision.revisionId === state.currentRevisionId
          ? { ...revision, supersededBy: event.revisionId }
          : revision
      );
      return ok({
        ...state,
        status: "InReview",
        currentRevisionId: event.revisionId,
        revisions: [
          ...supersededRevisions,
          {
            revisionId: event.revisionId,
            sequence: event.sequence,
            label: event.label,
            repositoryReference: event.repositoryReference,
            changeSummary: event.changeSummary,
            preparedBy: event.preparedBy,
            preparedAt: event.preparedAt,
            fingerprint: event.fingerprint,
            supersededBy: null
          }
        ]
      });
    }

    case "RevisionApproved": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "InReview") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({
        ...state,
        status: "Approved",
        lastReview: {
          revisionId: event.revisionId,
          decidedBy: event.decidedBy,
          decidedAt: event.decidedAt,
          comments: event.comments,
          selfApproved: event.selfApproved
        }
      });
    }

    case "RevisionRequired": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "InReview") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({
        ...state,
        status: "RevisionRequired",
        lastReview: {
          revisionId: event.revisionId,
          decidedBy: event.decidedBy,
          decidedAt: event.decidedAt,
          comments: event.comments,
          selfApproved: false
        }
      });
    }

    case "RevisionRejected": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "InReview") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({
        ...state,
        status: "Rejected",
        lastReview: {
          revisionId: event.revisionId,
          decidedBy: event.decidedBy,
          decidedAt: event.decidedAt,
          comments: event.comments,
          selfApproved: false
        }
      });
    }

    case "DeliverableWithdrawn": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status === "Withdrawn") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({ ...state, status: "Withdrawn" });
    }
  }
}
