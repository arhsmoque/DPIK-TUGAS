import { err, ok, type Result } from "@foundation/result";
import type {
  AcknowledgeAssignment,
  AcceptOutcome,
  AdjustTerms,
  AssignWork,
  CancelDelegation,
  CancelWorkThread,
  ChangeDueDate,
  ClaimWork,
  ConfirmRecall,
  CreateWorkThread,
  OfferOutcome,
  RaiseBlocker,
  RecordStructuredUpdate,
  ReopenWork,
  RequestRecall,
  RequestRenegotiation,
  RequestRework,
  ResolveBlocker,
  RetractRecall,
  StartWork,
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

const ACTIVE_ASSIGNMENT_LIFECYCLES = new Set(["Assigned", "InProgress", "AwaitingAcceptance"]);

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

function decideStartWork(state: WorkThreadState | null, command: StartWork): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.lifecycle !== "Assigned") {
    return err({ type: "work_thread_not_assigned", lifecycle: state.lifecycle });
  }
  if (state.currentAssignment.assigneeId !== command.startedBy) {
    return err({ type: "actor_not_current_assignee" });
  }
  if (!isValidDate(command.startedAt)) return err({ type: "invalid_event_time" });

  return ok([{ type: "WorkStarted", startedBy: command.startedBy, startedAt: command.startedAt }]);
}

function decideRecordStructuredUpdate(
  state: WorkThreadState | null,
  command: RecordStructuredUpdate
): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (!ACTIVE_ASSIGNMENT_LIFECYCLES.has(state.lifecycle)) {
    return err({ type: "work_thread_not_active", lifecycle: state.lifecycle });
  }
  if (!hasText(command.note)) return err({ type: "invalid_note" });
  if (!isValidDate(command.recordedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "StructuredUpdateRecorded",
      updateType: command.updateType,
      note: command.note.trim(),
      recordedBy: command.recordedBy,
      recordedAt: command.recordedAt
    }
  ]);
}

function decideRaiseBlocker(state: WorkThreadState | null, command: RaiseBlocker): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (!ACTIVE_ASSIGNMENT_LIFECYCLES.has(state.lifecycle)) {
    return err({ type: "work_thread_not_active", lifecycle: state.lifecycle });
  }
  if (state.blocker !== null) return err({ type: "blocker_already_open" });
  if (state.currentAssignment === null || state.currentAssignment.assigneeId !== command.raisedBy) {
    return err({ type: "actor_not_current_assignee" });
  }
  if (!hasText(command.blockedOutcome)) return err({ type: "invalid_note" });
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!hasText(command.effect)) return err({ type: "invalid_note" });
  if (!isValidDate(command.raisedAt) || !isValidDate(command.neededByAt)) {
    return err({ type: "invalid_event_time" });
  }

  return ok([
    {
      type: "BlockerRaised",
      blockedOutcome: command.blockedOutcome.trim(),
      reason: command.reason.trim(),
      requiredResolver: command.requiredResolver,
      effect: command.effect.trim(),
      neededByAt: command.neededByAt,
      raisedBy: command.raisedBy,
      raisedAt: command.raisedAt
    }
  ]);
}

function decideResolveBlocker(state: WorkThreadState | null, command: ResolveBlocker): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.blocker === null) return err({ type: "no_open_blocker" });
  if (state.blocker.requiredResolver !== command.resolvedBy) {
    return err({ type: "actor_not_required_resolver" });
  }
  if (!hasText(command.resolutionNote)) return err({ type: "invalid_resolution_note" });
  if (!isValidDate(command.resolvedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "BlockerResolved",
      resolvedBy: command.resolvedBy,
      resolvedAt: command.resolvedAt,
      resolutionNote: command.resolutionNote.trim()
    }
  ]);
}

function decideChangeDueDate(state: WorkThreadState | null, command: ChangeDueDate): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.currentAssignment === null) return err({ type: "no_current_assignment" });
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.newDueAt) || !isValidDate(command.changedAt)) {
    return err({ type: "invalid_event_time" });
  }
  if (command.newDueAt.getTime() <= command.changedAt.getTime()) {
    return err({ type: "invalid_due_commitment" });
  }

  return ok([
    {
      type: "DueDateChanged",
      previousDueAt: state.currentAssignment.dueAt,
      newDueAt: command.newDueAt,
      approvedBy: command.approvedBy,
      reason: command.reason.trim(),
      changedAt: command.changedAt
    }
  ]);
}

function decideOfferOutcome(state: WorkThreadState | null, command: OfferOutcome): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.lifecycle !== "InProgress") {
    return err({ type: "work_thread_not_in_progress", lifecycle: state.lifecycle });
  }
  if (state.currentAssignment.assigneeId !== command.offeredBy) {
    return err({ type: "actor_not_current_assignee" });
  }
  if (!hasText(command.summary)) return err({ type: "invalid_note" });
  if (!isValidDate(command.offeredAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "OutcomeOffered",
      offeredBy: command.offeredBy,
      offeredAt: command.offeredAt,
      summary: command.summary.trim()
    }
  ]);
}

function decideAcceptOutcome(state: WorkThreadState | null, command: AcceptOutcome): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.lifecycle !== "AwaitingAcceptance") {
    return err({ type: "work_thread_not_awaiting_acceptance", lifecycle: state.lifecycle });
  }
  if (!isValidDate(command.acceptedAt)) return err({ type: "invalid_event_time" });

  return ok([
    { type: "OutcomeAccepted", acceptedBy: command.acceptedBy, acceptedAt: command.acceptedAt }
  ]);
}

function decideRequestRework(state: WorkThreadState | null, command: RequestRework): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.lifecycle !== "AwaitingAcceptance") {
    return err({ type: "work_thread_not_awaiting_acceptance", lifecycle: state.lifecycle });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.requestedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ReworkRequested",
      requestedBy: command.requestedBy,
      requestedAt: command.requestedAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideReopenWork(state: WorkThreadState | null, command: ReopenWork): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.lifecycle !== "Closed") {
    return err({ type: "work_thread_not_closed", lifecycle: state.lifecycle });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.reopenedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "WorkReopened",
      reopenedBy: command.reopenedBy,
      reopenedAt: command.reopenedAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideCancelWorkThread(
  state: WorkThreadState | null,
  command: CancelWorkThread
): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.lifecycle === "Closed" || state.lifecycle === "Cancelled") {
    return err({ type: "work_thread_already_terminal", lifecycle: state.lifecycle });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.cancelledAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "WorkThreadCancelled",
      cancelledBy: command.cancelledBy,
      cancelledAt: command.cancelledAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideRequestRecall(state: WorkThreadState | null, command: RequestRecall): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.currentAssignment === null) return err({ type: "no_current_assignment" });
  if (state.pendingRecall !== null) return err({ type: "recall_already_pending" });
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.requestedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "RecallRequested",
      requestedBy: command.requestedBy,
      requestedAt: command.requestedAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideRetractRecall(state: WorkThreadState | null, command: RetractRecall): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.pendingRecall === null) return err({ type: "no_pending_recall" });
  if (state.pendingRecall.requestedBy !== command.retractedBy) {
    return err({ type: "actor_not_recall_requester" });
  }
  if (!isValidDate(command.retractedAt)) return err({ type: "invalid_event_time" });

  return ok([
    { type: "RecallRetracted", retractedBy: command.retractedBy, retractedAt: command.retractedAt }
  ]);
}

function decideConfirmRecall(state: WorkThreadState | null, command: ConfirmRecall): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.pendingRecall === null) return err({ type: "no_pending_recall" });
  if (state.currentAssignment === null) return err({ type: "no_current_assignment" });
  if (!isValidDate(command.confirmedAt) || !isValidDate(command.newDueAt)) {
    return err({ type: "invalid_event_time" });
  }
  if (command.newDueAt.getTime() <= command.confirmedAt.getTime()) {
    return err({ type: "invalid_due_commitment" });
  }

  return ok([
    { type: "RecallConfirmed", confirmedBy: command.confirmedBy, confirmedAt: command.confirmedAt },
    {
      type: "WorkAssigned",
      sequence: state.currentAssignment.sequence + 1,
      assigneeId: command.newAssigneeId,
      assignedBy: command.confirmedBy,
      assignedAt: command.confirmedAt,
      dueAt: command.newDueAt,
      reason: command.reason.trim() || "Reassigned following confirmed recall"
    }
  ]);
}

function decideRequestRenegotiation(
  state: WorkThreadState | null,
  command: RequestRenegotiation
): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.currentAssignment === null) return err({ type: "no_current_assignment" });
  if (state.currentAssignment.assigneeId !== command.requestedBy) {
    return err({ type: "actor_not_current_assignee" });
  }
  if (state.pendingRenegotiation !== null) return err({ type: "renegotiation_already_pending" });
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.requestedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "RenegotiationRequested",
      requestedBy: command.requestedBy,
      requestedAt: command.requestedAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideAdjustTerms(state: WorkThreadState | null, command: AdjustTerms): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.pendingRenegotiation === null) return err({ type: "no_pending_renegotiation" });
  if (state.currentAssignment === null) return err({ type: "no_current_assignment" });
  if (!isValidDate(command.adjustedAt) || !isValidDate(command.newDueAt)) {
    return err({ type: "invalid_event_time" });
  }
  if (command.newDueAt.getTime() <= command.adjustedAt.getTime()) {
    return err({ type: "invalid_due_commitment" });
  }

  return ok([
    {
      type: "TermsAdjusted",
      previousDueAt: state.currentAssignment.dueAt,
      newDueAt: command.newDueAt,
      adjustedBy: command.adjustedBy,
      adjustedAt: command.adjustedAt,
      note: command.note.trim()
    }
  ]);
}

function decideCancelDelegation(
  state: WorkThreadState | null,
  command: CancelDelegation
): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.pendingRenegotiation === null) return err({ type: "no_pending_renegotiation" });
  if (state.currentAssignment === null) return err({ type: "no_current_assignment" });
  if (command.reasonCode === "other" && !hasText(command.reasonDetail)) {
    return err({ type: "reason_detail_required_for_other" });
  }
  if (!isValidDate(command.cancelledAt)) return err({ type: "invalid_event_time" });

  const cancelled: WorkThreadEvent = {
    type: "DelegationCancelled",
    resolution: command.resolution,
    reasonCode: command.reasonCode,
    reasonDetail: command.reasonDetail.trim(),
    cancelledBy: command.cancelledBy,
    cancelledAt: command.cancelledAt
  };

  if (command.resolution === "reassign") {
    if (!isValidDate(command.newDueAt)) return err({ type: "invalid_event_time" });
    if (command.newDueAt.getTime() <= command.cancelledAt.getTime()) {
      return err({ type: "invalid_due_commitment" });
    }
    return ok([
      cancelled,
      {
        type: "WorkAssigned",
        sequence: state.currentAssignment.sequence + 1,
        assigneeId: command.newAssigneeId,
        assignedBy: command.cancelledBy,
        assignedAt: command.cancelledAt,
        dueAt: command.newDueAt,
        reason: `Reassigned after cancelled delegation (${command.reasonCode})`
      }
    ]);
  }

  if (command.resolution === "release_to_pool") {
    return ok([cancelled, { type: "ReleasedToOpenPool", releasedAt: command.cancelledAt }]);
  }

  return ok([
    cancelled,
    {
      type: "EscalatedForReassignment",
      escalatedTo: command.escalateTo,
      escalatedAt: command.cancelledAt
    }
  ]);
}

function decideClaimWork(state: WorkThreadState | null, command: ClaimWork): Decision {
  if (state === null) return err({ type: "work_thread_not_found" });
  if (state.lifecycle !== "Unassigned") {
    return err({ type: "work_thread_not_unassigned", lifecycle: state.lifecycle });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_assignment_reason" });
  if (!isValidDate(command.claimedAt) || !isValidDate(command.dueAt)) {
    return err({ type: "invalid_event_time" });
  }
  if (command.dueAt.getTime() <= command.claimedAt.getTime()) {
    return err({ type: "invalid_due_commitment" });
  }

  return ok([
    {
      type: "WorkAssigned",
      sequence: 1,
      assigneeId: command.claimedBy,
      assignedBy: command.claimedBy,
      assignedAt: command.claimedAt,
      dueAt: command.dueAt,
      reason: command.reason.trim()
    },
    {
      type: "AssignmentAcknowledged",
      sequence: 1,
      acknowledgedBy: command.claimedBy,
      acknowledgedAt: command.claimedAt
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
    case "StartWork":
      return decideStartWork(state, command);
    case "RecordStructuredUpdate":
      return decideRecordStructuredUpdate(state, command);
    case "RaiseBlocker":
      return decideRaiseBlocker(state, command);
    case "ResolveBlocker":
      return decideResolveBlocker(state, command);
    case "ChangeDueDate":
      return decideChangeDueDate(state, command);
    case "OfferOutcome":
      return decideOfferOutcome(state, command);
    case "AcceptOutcome":
      return decideAcceptOutcome(state, command);
    case "RequestRework":
      return decideRequestRework(state, command);
    case "ReopenWork":
      return decideReopenWork(state, command);
    case "CancelWorkThread":
      return decideCancelWorkThread(state, command);
    case "RequestRecall":
      return decideRequestRecall(state, command);
    case "RetractRecall":
      return decideRetractRecall(state, command);
    case "ConfirmRecall":
      return decideConfirmRecall(state, command);
    case "RequestRenegotiation":
      return decideRequestRenegotiation(state, command);
    case "AdjustTerms":
      return decideAdjustTerms(state, command);
    case "CancelDelegation":
      return decideCancelDelegation(state, command);
    case "ClaimWork":
      return decideClaimWork(state, command);
  }
}
