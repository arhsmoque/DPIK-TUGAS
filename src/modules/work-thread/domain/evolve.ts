import { err, ok, type Result } from "@foundation/result";
import type { WorkThreadEvent } from "./events";
import type { WorkThreadEvolutionFailure } from "./failures";
import type { WorkThreadState } from "./work-thread";

export function evolve(
  state: WorkThreadState | null,
  event: WorkThreadEvent
): Result<WorkThreadState, WorkThreadEvolutionFailure> {
  switch (event.type) {
    case "WorkThreadCreated":
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
        currentAssignment: null
      });

    case "WorkAssigned":
      if (state === null) {
        return err({ type: "event_requires_existing_state", eventType: event.type });
      }
      if (state.lifecycle !== "Unassigned") {
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
        }
      });

    case "AssignmentAcknowledged":
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
}
