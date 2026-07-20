import { err, ok, type Result } from "@foundation/result";
import type { WorkThreadEvent } from "./events";
import type { WorkThreadEvolutionFailure } from "./failures";
import type { WorkThreadState } from "./work-thread";

const ACTIVE_ASSIGNMENT_LIFECYCLES = new Set(["Assigned", "InProgress", "AwaitingAcceptance"]);

function isReassignable(lifecycle: string): boolean {
  return lifecycle === "Unassigned" || ACTIVE_ASSIGNMENT_LIFECYCLES.has(lifecycle);
}

export function evolve(
  state: WorkThreadState | null,
  event: WorkThreadEvent
): Result<WorkThreadState, WorkThreadEvolutionFailure> {
  switch (event.type) {
    case "WorkThreadCreated": {
      if (state !== null) {
        return err({ type: "event_requires_empty_state", eventType: event.type });
      }
      return ok({
        workThreadId: event.workThreadId,
        organisationId: event.organisationId,
        projectId: event.projectId,
        title: event.title,
        expectedOutcome: event.expectedOutcome,
        sourceReference: event.sourceReference,
        createdBy: event.createdBy,
        createdAt: event.createdAt,
        lifecycle: "Unassigned",
        currentAssignment: null,
        blocker: null,
        pendingRecall: null,
        pendingRenegotiation: null
      });
    }

    case "WorkAssigned": {
      if (state === null) {
        return err({ type: "event_requires_existing_state", eventType: event.type });
      }
      if (!isReassignable(state.lifecycle)) {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({
        ...state,
        lifecycle: "AwaitingAcknowledgement",
        currentAssignment: {
          sequence: event.sequence,
          assigneeId: event.assigneeId,
          assignedBy: event.assignedBy,
          assignedAt: event.assignedAt,
          dueAt: event.dueAt,
          reason: event.reason,
          acknowledgedAt: null
        },
        pendingRecall: null,
        pendingRenegotiation: null
      } as WorkThreadState);
    }

    case "AssignmentAcknowledged": {
      if (state === null) {
        return err({ type: "event_requires_existing_state", eventType: event.type });
      }
      if (state.lifecycle !== "AwaitingAcknowledgement") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      if (event.sequence !== state.currentAssignment.sequence) {
        return err({
          type: "assignment_sequence_mismatch",
          expected: state.currentAssignment.sequence,
          actual: event.sequence
        });
      }
      if (event.acknowledgedBy !== state.currentAssignment.assigneeId) {
        return err({ type: "acknowledgement_actor_mismatch" });
      }
      return ok({
        ...state,
        lifecycle: "Assigned",
        currentAssignment: {
          ...state.currentAssignment,
          acknowledgedAt: event.acknowledgedAt
        }
      });
    }

    case "WorkStarted": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.lifecycle !== "Assigned") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({ ...state, lifecycle: "InProgress" } as WorkThreadState);
    }

    case "StructuredUpdateRecorded": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (!ACTIVE_ASSIGNMENT_LIFECYCLES.has(state.lifecycle)) {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok(state);
    }

    case "BlockerRaised": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (!ACTIVE_ASSIGNMENT_LIFECYCLES.has(state.lifecycle)) {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({
        ...state,
        blocker: {
          blockedOutcome: event.blockedOutcome,
          reason: event.reason,
          requiredResolver: event.requiredResolver,
          effect: event.effect,
          neededByAt: event.neededByAt,
          raisedBy: event.raisedBy,
          raisedAt: event.raisedAt
        }
      });
    }

    case "BlockerResolved": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.blocker === null) {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({ ...state, blocker: null });
    }

    case "DueDateChanged": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.currentAssignment === null) {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({
        ...state,
        currentAssignment: { ...state.currentAssignment, dueAt: event.newDueAt }
      } as WorkThreadState);
    }

    case "OutcomeOffered": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.lifecycle !== "InProgress") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({ ...state, lifecycle: "AwaitingAcceptance" } as WorkThreadState);
    }

    case "OutcomeAccepted": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.lifecycle !== "AwaitingAcceptance") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({ ...state, lifecycle: "Closed" } as WorkThreadState);
    }

    case "ReworkRequested": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.lifecycle !== "AwaitingAcceptance") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({ ...state, lifecycle: "InProgress" } as WorkThreadState);
    }

    case "WorkReopened": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.lifecycle !== "Closed") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({ ...state, lifecycle: "InProgress" } as WorkThreadState);
    }

    case "WorkThreadCancelled": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.lifecycle === "Closed" || state.lifecycle === "Cancelled") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({ ...state, lifecycle: "Cancelled" } as WorkThreadState);
    }

    case "RecallRequested": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.currentAssignment === null || state.pendingRecall !== null) {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({
        ...state,
        pendingRecall: {
          requestedBy: event.requestedBy,
          requestedAt: event.requestedAt,
          reason: event.reason
        }
      });
    }

    case "RecallRetracted": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.pendingRecall === null) {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({ ...state, pendingRecall: null });
    }

    case "RecallConfirmed": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.pendingRecall === null) {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({ ...state, pendingRecall: null });
    }

    case "RenegotiationRequested": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.currentAssignment === null || state.pendingRenegotiation !== null) {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({
        ...state,
        pendingRenegotiation: {
          requestedBy: event.requestedBy,
          requestedAt: event.requestedAt,
          reason: event.reason
        }
      });
    }

    case "TermsAdjusted": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.pendingRenegotiation === null || state.currentAssignment === null) {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({
        ...state,
        pendingRenegotiation: null,
        currentAssignment: { ...state.currentAssignment, dueAt: event.newDueAt }
      } as WorkThreadState);
    }

    case "DelegationCancelled": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.pendingRenegotiation === null) {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({ ...state, pendingRenegotiation: null });
    }

    case "ReleasedToOpenPool": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      return ok({
        ...state,
        lifecycle: "Unassigned",
        currentAssignment: null
      } as WorkThreadState);
    }

    case "EscalatedForReassignment": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      return ok(state);
    }
  }
}
