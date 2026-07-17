import { err, ok, type Result } from "@foundation/result";
import type {
  AcknowledgeAssignment,
  AssignWork,
  CreateWorkThread,
  WorkThreadCommand
} from "./commands";
import type { WorkThreadEvent } from "./events";
import type { WorkThreadDecisionFailure } from "./failures";
import type { WorkThreadState } from "./work-thread";

type Decision = Result<readonly WorkThreadEvent[], WorkThreadDecisionFailure>;

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function decideCreate(state: WorkThreadState | null, command: CreateWorkThread): Decision {
  if (state !== null) return err({ type: "work_thread_already_exists" });
  if (!hasText(command.title)) return err({ type: "invalid_title" });
  if (!hasText(command.expectedOutcome)) return err({ type: "invalid_expected_outcome" });
  if (!hasText(command.sourceReference)) return err({ type: "invalid_source_reference" });
  if (!isValidDate(command.createdAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "WorkThreadCreated",
      workThreadId: command.workThreadId,
      organisationId: command.organisationId,
      projectId: command.projectId,
      title: command.title.trim(),
      expectedOutcome: command.expectedOutcome.trim(),
      sourceReference: command.sourceReference.trim(),
      createdBy: command.createdBy,
      createdAt: command.createdAt
    }
  ]);
}

function decideAssign(state: WorkThreadState | null, command: AssignWork): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.lifecycle !== "Unassigned") {
    return err({ type: "work_thread_not_unassigned", lifecycle: state.lifecycle });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_assignment_reason" });
  if (!isValidDate(command.assignedAt) || !isValidDate(command.dueAt)) {
    return err({ type: "invalid_event_time" });
  }
  if (command.dueAt.getTime() <= command.assignedAt.getTime()) {
    return err({ type: "invalid_due_commitment" });
  }

  return ok([
    {
      type: "WorkAssigned",
      sequence: 1,
      assigneeId: command.assigneeId,
      assignedBy: command.assignedBy,
      assignedAt: command.assignedAt,
      dueAt: command.dueAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideAcknowledge(
  state: WorkThreadState | null,
  command: AcknowledgeAssignment
): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.lifecycle !== "AwaitingAcknowledgement") {
    return err({
      type: "assignment_not_awaiting_acknowledgement",
      lifecycle: state.lifecycle
    });
  }
  if (state.currentAssignment.assigneeId !== command.acknowledgedBy) {
    return err({ type: "actor_not_current_assignee" });
  }
  if (
    !isValidDate(command.acknowledgedAt) ||
    command.acknowledgedAt.getTime() < state.currentAssignment.assignedAt.getTime()
  ) {
    return err({ type: "invalid_acknowledgement_time" });
  }

  return ok([
    {
      type: "AssignmentAcknowledged",
      sequence: state.currentAssignment.sequence,
      acknowledgedBy: command.acknowledgedBy,
      acknowledgedAt: command.acknowledgedAt
    }
  ]);
}

export function decide(state: WorkThreadState | null, command: WorkThreadCommand): Decision {
  switch (command.type) {
    case "CreateWorkThread":
      return decideCreate(state, command);
    case "AssignWork":
      return decideAssign(state, command);
    case "AcknowledgeAssignment":
      return decideAcknowledge(state, command);
  }
}
