import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  brand,
  type ActorId,
  type OrganisationId,
  type ProjectId,
  type WorkThreadId
} from "@foundation/index";
import type { AcknowledgeAssignment, AssignWork, CreateWorkThread } from "./commands";
import { decide } from "./decide";
import { evolve } from "./evolve";
import type { WorkThreadState } from "./work-thread";

const workThreadId = brand<string, "WorkThreadId">(
  "00000000-0000-4000-8000-000000000100"
) as WorkThreadId;
const organisationId = brand<string, "OrganisationId">(
  "00000000-0000-4000-8000-000000000010"
) as OrganisationId;
const projectId = brand<string, "ProjectId">("00000000-0000-4000-8000-000000000020") as ProjectId;
const ownerId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000001") as ActorId;
const assigneeId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000002") as ActorId;
const otherActorId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000003") as ActorId;
const thirdActorId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000004") as ActorId;
const createdAt = new Date("2026-07-17T01:00:00.000Z");
const assignedAt = new Date("2026-07-17T02:00:00.000Z");
const dueAt = new Date("2026-07-20T09:00:00.000Z");

const createCommand: CreateWorkThread = {
  type: "CreateWorkThread",
  workThreadId,
  organisationId,
  projectId,
  title: "Prepare drainage design response",
  expectedOutcome: "Approved response ready for formal submission",
  sourceReference: "Client instruction CI-042",
  createdBy: ownerId,
  createdAt
};

const assignCommand: AssignWork = {
  type: "AssignWork",
  assigneeId,
  assignedBy: ownerId,
  assignedAt,
  dueAt,
  reason: "Assigned to the drainage design engineer"
};

function apply(
  state: WorkThreadState | null,
  command: Parameters<typeof decide>[1]
): WorkThreadState {
  const decision = decide(state, command);
  if (!decision.ok) throw new Error(`fixture decision failed: ${JSON.stringify(decision.error)}`);
  let next = state;
  for (const event of decision.value) {
    const evolved = evolve(next, event);
    if (!evolved.ok) throw new Error(`fixture evolution failed: ${JSON.stringify(evolved.error)}`);
    next = evolved.value;
  }
  return next as WorkThreadState;
}

function unassignedState(): WorkThreadState {
  return apply(null, createCommand);
}

function awaitingAcknowledgementState(): WorkThreadState {
  return apply(unassignedState(), assignCommand);
}

function acceptedState(): WorkThreadState {
  return apply(awaitingAcknowledgementState(), {
    type: "AcknowledgeAssignment",
    acknowledgedBy: assigneeId,
    acknowledgedAt: new Date("2026-07-17T03:00:00.000Z")
  });
}

function inProgressState(): WorkThreadState {
  return apply(acceptedState(), {
    type: "StartWork",
    startedBy: assigneeId,
    startedAt: new Date("2026-07-17T04:00:00.000Z")
  });
}

function awaitingAcceptanceState(): WorkThreadState {
  return apply(inProgressState(), {
    type: "OfferOutcome",
    offeredBy: assigneeId,
    offeredAt: new Date("2026-07-18T04:00:00.000Z"),
    summary: "Drainage response drafted and ready for sign-off"
  });
}

function closedState(): WorkThreadState {
  return apply(awaitingAcceptanceState(), {
    type: "AcceptOutcome",
    acceptedBy: ownerId,
    acceptedAt: new Date("2026-07-18T05:00:00.000Z")
  });
}

describe("WT-01 CreateWorkThread", () => {
  it("creates an Unassigned Work Thread through accepted event evolution", () => {
    const decision = decide(null, createCommand);

    expect(decision).toEqual({
      ok: true,
      value: [expect.objectContaining({ type: "WorkThreadCreated", title: createCommand.title })]
    });
    if (decision.ok) {
      expect(evolve(null, decision.value[0]!)).toEqual({
        ok: true,
        value: expect.objectContaining({ lifecycle: "Unassigned", currentAssignment: null })
      });
    }
  });

  it("rejects duplicate creation and blank accountability facts without events", () => {
    const state = acceptedState();

    expect(decide(state, createCommand)).toEqual({
      ok: false,
      error: { type: "work_thread_already_exists" }
    });
    expect(decide(null, { ...createCommand, expectedOutcome: "  " })).toEqual({
      ok: false,
      error: { type: "invalid_expected_outcome" }
    });
  });
});

describe("WT-02 AssignWork", () => {
  it("records a due commitment and enters AwaitingAcknowledgement", () => {
    const unassigned = unassignedState();
    const decision = decide(unassigned, assignCommand);

    expect(decision).toEqual({
      ok: true,
      value: [expect.objectContaining({ type: "WorkAssigned", sequence: 1, assigneeId, dueAt })]
    });
    if (decision.ok) {
      expect(evolve(unassigned, decision.value[0]!)).toEqual({
        ok: true,
        value: expect.objectContaining({
          lifecycle: "AwaitingAcknowledgement",
          currentAssignment: expect.objectContaining({ assigneeId, acknowledgedAt: null })
        })
      });
    }
  });

  it("rejects assignment when state or due commitment is invalid", () => {
    expect(decide(null, assignCommand)).toEqual({
      ok: false,
      error: { type: "work_thread_not_found" }
    });
    expect(decide(acceptedState(), assignCommand)).toEqual({
      ok: false,
      error: { type: "work_thread_not_unassigned", lifecycle: "Assigned" }
    });

    const unassigned = unassignedState();
    expect(decide(unassigned, { ...assignCommand, dueAt: assignedAt })).toEqual({
      ok: false,
      error: { type: "invalid_due_commitment" }
    });
  });
});

describe("WT-03 AcknowledgeAssignment", () => {
  const acknowledgeCommand: AcknowledgeAssignment = {
    type: "AcknowledgeAssignment",
    acknowledgedBy: assigneeId,
    acknowledgedAt: new Date("2026-07-17T03:00:00.000Z")
  };

  it("allows only the current assignee and enters Assigned", () => {
    const state = awaitingAcknowledgementState();
    const decision = decide(state, acknowledgeCommand);

    expect(decision).toEqual({
      ok: true,
      value: [
        expect.objectContaining({ type: "AssignmentAcknowledged", acknowledgedBy: assigneeId })
      ]
    });
    if (decision.ok) {
      expect(evolve(state, decision.value[0]!)).toEqual({
        ok: true,
        value: expect.objectContaining({
          lifecycle: "Assigned",
          currentAssignment: expect.objectContaining({
            assigneeId,
            acknowledgedAt: acknowledgeCommand.acknowledgedAt
          })
        })
      });
    }
  });

  it("rejects the wrong actor without emitting an event", () => {
    expect(
      decide(awaitingAcknowledgementState(), {
        ...acknowledgeCommand,
        acknowledgedBy: otherActorId
      })
    ).toEqual({ ok: false, error: { type: "actor_not_current_assignee" } });
  });
});

describe("Work Thread properties", () => {
  it("never accepts a due commitment that is not later than assignment", () => {
    const unassigned = unassignedState();

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 86_400_000 }), (offset) => {
        const invalidDue = new Date(assignedAt.getTime() - offset);
        const result = decide(unassigned, { ...assignCommand, dueAt: invalidDue });
        expect(result).toEqual({ ok: false, error: { type: "invalid_due_commitment" } });
      })
    );
  });

  it("trims non-empty accountability text at the event boundary", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((value) => value.trim().length > 0),
        (text) => {
          const result = decide(null, {
            ...createCommand,
            title: ` ${text} `,
            expectedOutcome: ` ${text} `,
            sourceReference: ` ${text} `
          });
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.value[0]).toEqual(
              expect.objectContaining({
                title: text.trim(),
                expectedOutcome: text.trim(),
                sourceReference: text.trim()
              })
            );
          }
        }
      )
    );
  });
});

describe("Work Thread evolution integrity", () => {
  it("rejects an assignment event without an existing Work Thread", () => {
    const unassigned = unassignedState();
    const assignment = decide(unassigned, assignCommand);
    if (!assignment.ok) throw new Error("assign failed");

    expect(evolve(null, assignment.value[0]!)).toEqual({
      ok: false,
      error: { type: "event_requires_existing_state", eventType: "WorkAssigned" }
    });
  });

  it("rejects acknowledgement for the wrong assignment sequence", () => {
    const state = awaitingAcknowledgementState();

    expect(
      evolve(state, {
        type: "AssignmentAcknowledged",
        sequence: 99,
        acknowledgedBy: assigneeId,
        acknowledgedAt: new Date("2026-07-17T03:00:00.000Z")
      })
    ).toEqual({
      ok: false,
      error: { type: "assignment_sequence_mismatch", expected: 1, actual: 99 }
    });
  });
});

describe("WT-04 StartWork and structured updates", () => {
  it("moves Assigned to InProgress only for the current assignee", () => {
    const state = acceptedState();
    const decision = decide(state, {
      type: "StartWork",
      startedBy: assigneeId,
      startedAt: new Date("2026-07-17T04:00:00.000Z")
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(evolve(state, decision.value[0]!)).toEqual({
        ok: true,
        value: expect.objectContaining({ lifecycle: "InProgress" })
      });
    }

    expect(
      decide(state, { type: "StartWork", startedBy: otherActorId, startedAt: new Date() })
    ).toEqual({ ok: false, error: { type: "actor_not_current_assignee" } });
  });

  it("records structured updates without changing lifecycle", () => {
    const state = inProgressState();
    const decision = decide(state, {
      type: "RecordStructuredUpdate",
      updateType: "Progress",
      note: "Drainage calc pack drafted",
      recordedBy: assigneeId,
      recordedAt: new Date("2026-07-17T05:00:00.000Z")
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      const evolved = evolve(state, decision.value[0]!);
      expect(evolved).toEqual({ ok: true, value: state });
    }
  });

  it("rejects a blank structured update note", () => {
    expect(
      decide(inProgressState(), {
        type: "RecordStructuredUpdate",
        updateType: "Question",
        note: "   ",
        recordedBy: assigneeId,
        recordedAt: new Date()
      })
    ).toEqual({ ok: false, error: { type: "invalid_note" } });
  });
});

describe("WT-05 Blocker", () => {
  const raiseCommand = {
    type: "RaiseBlocker" as const,
    blockedOutcome: "Drainage calc pack",
    reason: "Waiting on survey data from client",
    requiredResolver: ownerId,
    effect: "Cannot finalise design",
    neededByAt: new Date("2026-07-19T00:00:00.000Z"),
    raisedBy: assigneeId,
    raisedAt: new Date("2026-07-17T05:00:00.000Z")
  };

  it("raises a blocker as an orthogonal fact and resolves it by the required resolver", () => {
    const inProgress = inProgressState();
    const raised = apply(inProgress, raiseCommand);
    expect(raised.lifecycle).toBe("InProgress");
    expect(raised.blocker).toEqual(
      expect.objectContaining({
        requiredResolver: ownerId,
        blockedOutcome: raiseCommand.blockedOutcome
      })
    );

    expect(
      decide(raised, {
        type: "ResolveBlocker",
        resolvedBy: assigneeId,
        resolvedAt: new Date("2026-07-17T06:00:00.000Z"),
        resolutionNote: "Survey data received"
      })
    ).toEqual({ ok: false, error: { type: "actor_not_required_resolver" } });

    const resolved = apply(raised, {
      type: "ResolveBlocker",
      resolvedBy: ownerId,
      resolvedAt: new Date("2026-07-17T06:00:00.000Z"),
      resolutionNote: "Survey data received"
    });
    expect(resolved.blocker).toBeNull();
  });

  it("rejects raising a second blocker while one is already open", () => {
    const raised = apply(inProgressState(), raiseCommand);
    expect(decide(raised, raiseCommand)).toEqual({
      ok: false,
      error: { type: "blocker_already_open" }
    });
  });
});

describe("WT-06 Due date change and outcome lifecycle", () => {
  it("preserves the previous due date when changing commitment", () => {
    const state = inProgressState();
    const decision = decide(state, {
      type: "ChangeDueDate",
      newDueAt: new Date("2026-07-25T09:00:00.000Z"),
      approvedBy: ownerId,
      reason: "Client extended the response window",
      changedAt: new Date("2026-07-18T00:00:00.000Z")
    });
    expect(decision).toEqual({
      ok: true,
      value: [expect.objectContaining({ type: "DueDateChanged", previousDueAt: dueAt })]
    });
  });

  it("moves InProgress -> AwaitingAcceptance -> Closed, and supports RequestRework back to InProgress", () => {
    const offered = awaitingAcceptanceState();
    expect(offered.lifecycle).toBe("AwaitingAcceptance");

    const sentBack = apply(offered, {
      type: "RequestRework",
      requestedBy: ownerId,
      requestedAt: new Date("2026-07-18T06:00:00.000Z"),
      reason: "Missing appendix"
    });
    expect(sentBack.lifecycle).toBe("InProgress");

    const closed = closedState();
    expect(closed.lifecycle).toBe("Closed");
  });

  it("reopens closed work only with a reason", () => {
    const closed = closedState();
    expect(
      decide(closed, {
        type: "ReopenWork",
        reopenedBy: ownerId,
        reopenedAt: new Date("2026-07-19T00:00:00.000Z"),
        reason: ""
      })
    ).toEqual({ ok: false, error: { type: "invalid_reason" } });

    const reopened = apply(closed, {
      type: "ReopenWork",
      reopenedBy: ownerId,
      reopenedAt: new Date("2026-07-19T00:00:00.000Z"),
      reason: "Client raised a defect"
    });
    expect(reopened.lifecycle).toBe("InProgress");
  });
});

describe("WT-07 Recall negotiation", () => {
  it("supports request, retract, and confirm — confirm reassigns and preserves history", () => {
    const state = inProgressState();
    const requested = apply(state, {
      type: "RequestRecall",
      requestedBy: ownerId,
      requestedAt: new Date("2026-07-18T00:00:00.000Z"),
      reason: "Reassigning to balance workload"
    });
    expect(requested.pendingRecall).toEqual(expect.objectContaining({ requestedBy: ownerId }));
    expect(requested.lifecycle).toBe("InProgress");

    expect(
      decide(requested, {
        type: "RequestRecall",
        requestedBy: ownerId,
        requestedAt: new Date(),
        reason: "again"
      })
    ).toEqual({
      ok: false,
      error: { type: "recall_already_pending" }
    });

    const retracted = apply(requested, {
      type: "RetractRecall",
      retractedBy: ownerId,
      retractedAt: new Date("2026-07-18T01:00:00.000Z")
    });
    expect(retracted.pendingRecall).toBeNull();
    expect(retracted.lifecycle).toBe("InProgress");
    expect(retracted.currentAssignment).toEqual(state.currentAssignment);

    const reRequested = apply(retracted, {
      type: "RequestRecall",
      requestedBy: ownerId,
      requestedAt: new Date("2026-07-18T02:00:00.000Z"),
      reason: "Reassigning to balance workload"
    });
    const confirmed = apply(reRequested, {
      type: "ConfirmRecall",
      confirmedBy: ownerId,
      confirmedAt: new Date("2026-07-18T03:00:00.000Z"),
      newAssigneeId: otherActorId,
      newDueAt: new Date("2026-07-26T09:00:00.000Z"),
      reason: "Handover to another engineer"
    });
    expect(confirmed.lifecycle).toBe("AwaitingAcknowledgement");
    expect(confirmed.pendingRecall).toBeNull();
    expect(confirmed.currentAssignment).toEqual(
      expect.objectContaining({ sequence: 2, assigneeId: otherActorId, acknowledgedAt: null })
    );
  });

  it("only the requester may retract their own recall", () => {
    const requested = apply(inProgressState(), {
      type: "RequestRecall",
      requestedBy: ownerId,
      requestedAt: new Date("2026-07-18T00:00:00.000Z"),
      reason: "Reassigning to balance workload"
    });
    expect(
      decide(requested, {
        type: "RetractRecall",
        retractedBy: thirdActorId,
        retractedAt: new Date()
      })
    ).toEqual({ ok: false, error: { type: "actor_not_recall_requester" } });
  });
});

describe("WT-08 Renegotiation", () => {
  it("is self-service for the current assignee and closes via TermsAdjusted", () => {
    const state = inProgressState();
    expect(
      decide(state, {
        type: "RequestRenegotiation",
        requestedBy: ownerId,
        requestedAt: new Date(),
        reason: "not the assignee"
      })
    ).toEqual({ ok: false, error: { type: "actor_not_current_assignee" } });

    const requested = apply(state, {
      type: "RequestRenegotiation",
      requestedBy: assigneeId,
      requestedAt: new Date("2026-07-18T00:00:00.000Z"),
      reason: "Overloaded this week"
    });
    expect(requested.pendingRenegotiation).toEqual(
      expect.objectContaining({ requestedBy: assigneeId })
    );

    const adjusted = apply(requested, {
      type: "AdjustTerms",
      adjustedBy: ownerId,
      adjustedAt: new Date("2026-07-18T01:00:00.000Z"),
      newDueAt: new Date("2026-07-27T09:00:00.000Z"),
      note: "Extended by one week"
    });
    expect(adjusted.pendingRenegotiation).toBeNull();
    expect(adjusted.currentAssignment).toEqual(
      expect.objectContaining({ assigneeId, dueAt: new Date("2026-07-27T09:00:00.000Z") })
    );
  });

  it("CancelDelegation resolves to reassign, release-to-pool, or escalate", () => {
    const requestedState = apply(inProgressState(), {
      type: "RequestRenegotiation",
      requestedBy: assigneeId,
      requestedAt: new Date("2026-07-18T00:00:00.000Z"),
      reason: "Overloaded this week"
    });

    const reassigned = apply(requestedState, {
      type: "CancelDelegation",
      resolution: "reassign",
      newAssigneeId: otherActorId,
      newDueAt: new Date("2026-07-28T09:00:00.000Z"),
      reasonCode: "overload",
      reasonDetail: "",
      cancelledBy: ownerId,
      cancelledAt: new Date("2026-07-18T02:00:00.000Z")
    });
    expect(reassigned.lifecycle).toBe("AwaitingAcknowledgement");
    expect(reassigned.currentAssignment).toEqual(
      expect.objectContaining({ sequence: 2, assigneeId: otherActorId })
    );

    const released = apply(requestedState, {
      type: "CancelDelegation",
      resolution: "release_to_pool",
      reasonCode: "emergency",
      reasonDetail: "",
      cancelledBy: ownerId,
      cancelledAt: new Date("2026-07-18T02:00:00.000Z")
    });
    expect(released.lifecycle).toBe("Unassigned");
    expect(released.currentAssignment).toBeNull();

    const escalated = apply(requestedState, {
      type: "CancelDelegation",
      resolution: "escalate",
      escalateTo: thirdActorId,
      reasonCode: "scope_mismatch",
      reasonDetail: "",
      cancelledBy: ownerId,
      cancelledAt: new Date("2026-07-18T02:00:00.000Z")
    });
    expect(escalated.lifecycle).toBe("InProgress");
    expect(escalated.pendingRenegotiation).toBeNull();
    expect(escalated.currentAssignment).toEqual(requestedState.currentAssignment);
  });

  it("requires reason detail when reason code is other", () => {
    const requestedState = apply(inProgressState(), {
      type: "RequestRenegotiation",
      requestedBy: assigneeId,
      requestedAt: new Date("2026-07-18T00:00:00.000Z"),
      reason: "Overloaded this week"
    });
    expect(
      decide(requestedState, {
        type: "CancelDelegation",
        resolution: "release_to_pool",
        reasonCode: "other",
        reasonDetail: "",
        cancelledBy: ownerId,
        cancelledAt: new Date()
      })
    ).toEqual({ ok: false, error: { type: "reason_detail_required_for_other" } });
  });
});

describe("WT-09 ClaimWork", () => {
  it("self-assigns and self-acknowledges from the open pool in one step", () => {
    const unassigned = unassignedState();
    const claimed = apply(unassigned, {
      type: "ClaimWork",
      claimedBy: otherActorId,
      claimedAt: new Date("2026-07-17T02:00:00.000Z"),
      dueAt: new Date("2026-07-21T09:00:00.000Z"),
      reason: "Picking this up from the open pool"
    });
    expect(claimed.lifecycle).toBe("Assigned");
    expect(claimed.currentAssignment).toEqual(
      expect.objectContaining({ assigneeId: otherActorId, assignedBy: otherActorId })
    );
  });

  it("rejects claiming work that already has an assignee", () => {
    expect(
      decide(acceptedState(), {
        type: "ClaimWork",
        claimedBy: otherActorId,
        claimedAt: new Date(),
        dueAt: new Date("2026-07-21T09:00:00.000Z"),
        reason: "trying to claim"
      })
    ).toEqual({ ok: false, error: { type: "work_thread_not_unassigned", lifecycle: "Assigned" } });
  });
});

describe("WT-10 CancelWorkThread", () => {
  it("cancels an open Work Thread with a reason and blocks cancelling a terminal one twice", () => {
    const cancelled = apply(inProgressState(), {
      type: "CancelWorkThread",
      cancelledBy: ownerId,
      cancelledAt: new Date("2026-07-19T00:00:00.000Z"),
      reason: "No longer required"
    });
    expect(cancelled.lifecycle).toBe("Cancelled");

    expect(
      decide(cancelled, {
        type: "CancelWorkThread",
        cancelledBy: ownerId,
        cancelledAt: new Date(),
        reason: "again"
      })
    ).toEqual({
      ok: false,
      error: { type: "work_thread_already_terminal", lifecycle: "Cancelled" }
    });
  });
});
