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

function acceptedState(): WorkThreadState {
  const created = decide(null, createCommand);
  if (!created.ok) throw new Error("fixture create decision failed");
  const unassigned = evolve(null, created.value[0]!);
  if (!unassigned.ok) throw new Error("fixture create evolution failed");
  const assigned = decide(unassigned.value, assignCommand);
  if (!assigned.ok) throw new Error("fixture assign decision failed");
  const awaiting = evolve(unassigned.value, assigned.value[0]!);
  if (!awaiting.ok) throw new Error("fixture assignment evolution failed");
  return awaiting.value;
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
    const created = decide(null, createCommand);
    if (!created.ok) throw new Error("create failed");
    const unassigned = evolve(null, created.value[0]!);
    if (!unassigned.ok) throw new Error("evolve create failed");

    const decision = decide(unassigned.value, assignCommand);

    expect(decision).toEqual({
      ok: true,
      value: [expect.objectContaining({ type: "WorkAssigned", sequence: 1, assigneeId, dueAt })]
    });
    if (decision.ok) {
      expect(evolve(unassigned.value, decision.value[0]!)).toEqual({
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
      error: { type: "work_thread_not_unassigned", lifecycle: "AwaitingAcknowledgement" }
    });

    const created = decide(null, createCommand);
    if (!created.ok) throw new Error("create failed");
    const unassigned = evolve(null, created.value[0]!);
    if (!unassigned.ok) throw new Error("evolve create failed");
    expect(decide(unassigned.value, { ...assignCommand, dueAt: assignedAt })).toEqual({
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
    const state = acceptedState();
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
      decide(acceptedState(), { ...acknowledgeCommand, acknowledgedBy: otherActorId })
    ).toEqual({ ok: false, error: { type: "actor_not_current_assignee" } });
  });
});

describe("Work Thread properties", () => {
  it("never accepts a due commitment that is not later than assignment", () => {
    const created = decide(null, createCommand);
    if (!created.ok) throw new Error("create failed");
    const unassigned = evolve(null, created.value[0]!);
    if (!unassigned.ok) throw new Error("evolve create failed");

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 86_400_000 }), (offset) => {
        const invalidDue = new Date(assignedAt.getTime() - offset);
        const result = decide(unassigned.value, { ...assignCommand, dueAt: invalidDue });
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
    const created = decide(null, createCommand);
    if (!created.ok) throw new Error("create failed");
    const unassigned = evolve(null, created.value[0]!);
    if (!unassigned.ok) throw new Error("evolve create failed");
    const assignment = decide(unassigned.value, assignCommand);
    if (!assignment.ok) throw new Error("assign failed");

    expect(evolve(null, assignment.value[0]!)).toEqual({
      ok: false,
      error: { type: "event_requires_existing_state", eventType: "WorkAssigned" }
    });
  });

  it("rejects acknowledgement for the wrong assignment sequence", () => {
    const state = acceptedState();

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
