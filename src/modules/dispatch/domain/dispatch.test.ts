import { describe, expect, it } from "vitest";
import {
  brand,
  type ActorId,
  type DispatchAttemptId,
  type OrganisationId,
  type ProjectId,
  type SubmissionId
} from "@foundation/index";
import type { CreateDispatchAttempt, DispatchCommand } from "./commands";
import { decide } from "./decide";
import { evolve } from "./evolve";
import type { DispatchState } from "./dispatch";

const dispatchAttemptId = brand<string, "DispatchAttemptId">(
  "00000000-0000-4000-8000-000000000500"
) as DispatchAttemptId;
const replacementAttemptId = brand<string, "DispatchAttemptId">(
  "00000000-0000-4000-8000-000000000501"
) as DispatchAttemptId;
const submissionId = brand<string, "SubmissionId">(
  "00000000-0000-4000-8000-000000000400"
) as SubmissionId;
const organisationId = brand<string, "OrganisationId">(
  "00000000-0000-4000-8000-000000000010"
) as OrganisationId;
const projectId = brand<string, "ProjectId">("00000000-0000-4000-8000-000000000020") as ProjectId;
const coordinatorId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000006") as ActorId;
const custodianActorId = brand<string, "ActorId">(
  "00000000-0000-4000-8000-000000000007"
) as ActorId;

const createCommand: CreateDispatchAttempt = {
  type: "CreateDispatchAttempt",
  dispatchAttemptId,
  submissionId,
  organisationId,
  projectId,
  destination: "JKR Bentong Office",
  recipientContact: "En. Aziz, +6012-3456789",
  packageSummary: "Drainage submission SUB-2026-001",
  createdBy: coordinatorId,
  createdAt: new Date("2026-07-19T08:00:00.000Z")
};

function apply(state: DispatchState | null, command: DispatchCommand): DispatchState {
  const decision = decide(state, command);
  if (!decision.ok) throw new Error(`fixture decision failed: ${JSON.stringify(decision.error)}`);
  let next = state;
  for (const event of decision.value) {
    const evolved = evolve(next, event);
    if (!evolved.ok) throw new Error(`fixture evolution failed: ${JSON.stringify(evolved.error)}`);
    next = evolved.value;
  }
  return next as DispatchState;
}

function preparedState(): DispatchState {
  return apply(null, createCommand);
}

function assignedState(): DispatchState {
  return apply(preparedState(), {
    type: "AssignDispatch",
    custodianType: "internal",
    custodianActorId,
    custodianName: "Farhan (site engineer, informal courier)",
    assignedBy: coordinatorId,
    assignedAt: new Date("2026-07-19T09:00:00.000Z")
  });
}

function inTransitState(): DispatchState {
  return apply(assignedState(), {
    type: "ConfirmPackageCollection",
    confirmedBy: custodianActorId,
    confirmedAt: new Date("2026-07-19T10:00:00.000Z")
  });
}

describe("DP-01 CreateDispatchAttempt", () => {
  it("creates a Prepared attempt with no custodian yet", () => {
    const prepared = preparedState();
    expect(prepared.status).toBe("Prepared");
    expect(prepared.custodian).toBeNull();
    expect(prepared.facts.replacesDispatchAttemptId).toBeNull();
  });
});

describe("DP-02..04 happy path to Delivered", () => {
  it("moves Prepared -> Assigned -> InTransit -> Delivered", () => {
    const delivered = apply(inTransitState(), {
      type: "ReportPackageDelivery",
      reportedBy: custodianActorId,
      reportedAt: new Date("2026-07-19T11:00:00.000Z"),
      deliveredTo: "En. Aziz (document control counter)"
    });
    expect(delivered.status).toBe("Delivered");
    expect(delivered.deliveredTo).toBe("En. Aziz (document control counter)");
  });

  it("requires an internal custodian to carry an actor id", () => {
    expect(
      decide(preparedState(), {
        type: "AssignDispatch",
        custodianType: "internal",
        custodianActorId: null,
        custodianName: "Someone",
        assignedBy: coordinatorId,
        assignedAt: new Date()
      })
    ).toEqual({ ok: false, error: { type: "invalid_custodian" } });
  });

  it("accepts an external courier with no system identity", () => {
    const assigned = apply(preparedState(), {
      type: "AssignDispatch",
      custodianType: "external",
      custodianActorId: null,
      custodianName: "Lalamove rider #4821",
      assignedBy: coordinatorId,
      assignedAt: new Date("2026-07-19T09:00:00.000Z")
    });
    expect(assigned.custodian).toEqual(
      expect.objectContaining({ custodianType: "external", custodianActorId: null })
    );
  });
});

describe("DP-05..07 failure and replacement", () => {
  it("reports failure from Assigned or InTransit, never resetting to Prepared", () => {
    const failedFromAssigned = apply(assignedState(), {
      type: "ReportDeliveryFailure",
      reportedBy: coordinatorId,
      reportedAt: new Date("2026-07-19T09:30:00.000Z"),
      reason: "Recipient office closed"
    });
    expect(failedFromAssigned.status).toBe("Failed");
    expect(failedFromAssigned.failureReason).toBe("Recipient office closed");

    expect(
      decide(failedFromAssigned, {
        type: "ReportPackageDelivery",
        reportedBy: coordinatorId,
        reportedAt: new Date(),
        deliveredTo: "someone"
      })
    ).toEqual({ ok: false, error: { type: "dispatch_not_in_transit", status: "Failed" } });
  });

  it("creates a replacement attempt linked to the failed one, preserving it in history", () => {
    const failed = apply(assignedState(), {
      type: "ReportDeliveryFailure",
      reportedBy: coordinatorId,
      reportedAt: new Date("2026-07-19T09:30:00.000Z"),
      reason: "Recipient office closed"
    });

    const replacement = apply(null, {
      type: "CreateReplacementDispatchAttempt",
      dispatchAttemptId: replacementAttemptId,
      submissionId,
      organisationId,
      projectId,
      destination: createCommand.destination,
      recipientContact: createCommand.recipientContact,
      packageSummary: createCommand.packageSummary,
      replacesDispatchAttemptId: dispatchAttemptId,
      createdBy: coordinatorId,
      createdAt: new Date("2026-07-20T08:00:00.000Z")
    });

    expect(replacement.status).toBe("Prepared");
    expect(replacement.facts.replacesDispatchAttemptId).toBe(dispatchAttemptId);
    expect(failed.status).toBe("Failed");
  });

  it("cancels only from Prepared or Assigned, with a reason", () => {
    expect(
      decide(inTransitState(), {
        type: "CancelDispatchAttempt",
        cancelledBy: coordinatorId,
        cancelledAt: new Date(),
        reason: "attempt"
      })
    ).toEqual({ ok: false, error: { type: "dispatch_not_cancellable", status: "InTransit" } });

    const cancelled = apply(preparedState(), {
      type: "CancelDispatchAttempt",
      cancelledBy: coordinatorId,
      cancelledAt: new Date("2026-07-19T08:30:00.000Z"),
      reason: "Submission recalled before dispatch"
    });
    expect(cancelled.status).toBe("Cancelled");
  });
});
