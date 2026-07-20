import { describe, expect, it } from "vitest";
import {
  brand,
  type ActorId,
  type GovernanceGateId,
  type OrganisationId,
  type ProjectId
} from "@foundation/index";
import type { GovernanceGateCommand } from "./commands";
import { decide } from "./decide";
import { evolve } from "./evolve";
import type { GovernanceGateState } from "./governance-gate";

const gateId = brand<string, "GovernanceGateId">(
  "00000000-0000-4000-8000-000000000900"
) as GovernanceGateId;
const organisationId = brand<string, "OrganisationId">(
  "00000000-0000-4000-8000-000000000010"
) as OrganisationId;
const projectId = brand<string, "ProjectId">("00000000-0000-4000-8000-000000000020") as ProjectId;
const operatorId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000001") as ActorId;
const approverId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000002") as ActorId;

function apply(
  state: GovernanceGateState | null,
  command: GovernanceGateCommand
): GovernanceGateState {
  const decision = decide(state, command);
  if (!decision.ok) throw new Error(`fixture decision failed: ${JSON.stringify(decision.error)}`);
  let next = state;
  for (const event of decision.value) {
    const evolved = evolve(next, event);
    if (!evolved.ok) throw new Error(`fixture evolution failed: ${JSON.stringify(evolved.error)}`);
    next = evolved.value;
  }
  return next as GovernanceGateState;
}

function openState(): GovernanceGateState {
  return {
    facts: { gateId, organisationId, projectId, gateType: "operational_approval" },
    lifecycle: "Open",
    deferral: null,
    approval: null
  };
}

describe("DeferGate", () => {
  it("moves Open -> Deferred with the reason, actor, and time recorded", () => {
    const deferred = apply(openState(), {
      type: "DeferGate",
      gateId,
      reason: "Testing in staging before formal sign-off",
      deferredBy: operatorId,
      deferredAt: new Date("2026-07-20T10:00:00.000Z")
    });
    expect(deferred.lifecycle).toBe("Deferred");
    expect(deferred.deferral).toEqual({
      reason: "Testing in staging before formal sign-off",
      deferredBy: operatorId,
      deferredAt: new Date("2026-07-20T10:00:00.000Z")
    });
  });

  it("rejects a blank reason", () => {
    const decision = decide(openState(), {
      type: "DeferGate",
      gateId,
      reason: "   ",
      deferredBy: operatorId,
      deferredAt: new Date("2026-07-20T10:00:00.000Z")
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.error).toEqual({ type: "invalid_reason" });
  });

  it("rejects an invalid event time", () => {
    const decision = decide(openState(), {
      type: "DeferGate",
      gateId,
      reason: "Reason",
      deferredBy: operatorId,
      deferredAt: new Date("not-a-date")
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.error).toEqual({ type: "invalid_event_time" });
  });

  it("rejects deferring a gate that is not Open (already Deferred)", () => {
    const deferred = apply(openState(), {
      type: "DeferGate",
      gateId,
      reason: "First defer",
      deferredBy: operatorId,
      deferredAt: new Date("2026-07-20T10:00:00.000Z")
    });
    const decision = decide(deferred, {
      type: "DeferGate",
      gateId,
      reason: "Second defer",
      deferredBy: operatorId,
      deferredAt: new Date("2026-07-20T11:00:00.000Z")
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok)
      expect(decision.error).toEqual({ type: "gate_not_open", lifecycle: "Deferred" });
  });

  it("rejects deferring a gate that does not exist", () => {
    const decision = decide(null, {
      type: "DeferGate",
      gateId,
      reason: "Reason",
      deferredBy: operatorId,
      deferredAt: new Date("2026-07-20T10:00:00.000Z")
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.error).toEqual({ type: "gate_not_found" });
  });
});

describe("ReconsiderGateDeferral (change of mind)", () => {
  it("moves Deferred -> Open and clears the deferral record", () => {
    const deferred = apply(openState(), {
      type: "DeferGate",
      gateId,
      reason: "Reason",
      deferredBy: operatorId,
      deferredAt: new Date("2026-07-20T10:00:00.000Z")
    });
    const reconsidered = apply(deferred, {
      type: "ReconsiderGateDeferral",
      gateId,
      reconsideredBy: operatorId,
      reconsideredAt: new Date("2026-07-20T12:00:00.000Z")
    });
    expect(reconsidered.lifecycle).toBe("Open");
    expect(reconsidered.deferral).toBeNull();
  });

  it("rejects reconsidering a gate that is not Deferred", () => {
    const decision = decide(openState(), {
      type: "ReconsiderGateDeferral",
      gateId,
      reconsideredBy: operatorId,
      reconsideredAt: new Date("2026-07-20T12:00:00.000Z")
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok)
      expect(decision.error).toEqual({ type: "gate_not_deferred", lifecycle: "Open" });
  });
});

describe("ApproveGate", () => {
  it("is legal from Open", () => {
    const approved = apply(openState(), {
      type: "ApproveGate",
      gateId,
      approvedBy: approverId,
      approvedAt: new Date("2026-07-20T13:00:00.000Z")
    });
    expect(approved.lifecycle).toBe("Approved");
    expect(approved.approval).toEqual({
      approvedBy: approverId,
      approvedAt: new Date("2026-07-20T13:00:00.000Z")
    });
  });

  it("is legal from Deferred and clears the deferral", () => {
    const deferred = apply(openState(), {
      type: "DeferGate",
      gateId,
      reason: "Reason",
      deferredBy: operatorId,
      deferredAt: new Date("2026-07-20T10:00:00.000Z")
    });
    const approved = apply(deferred, {
      type: "ApproveGate",
      gateId,
      approvedBy: approverId,
      approvedAt: new Date("2026-07-20T13:00:00.000Z")
    });
    expect(approved.lifecycle).toBe("Approved");
    expect(approved.deferral).toBeNull();
    expect(approved.approval?.approvedBy).toBe(approverId);
  });

  it("rejects approving a gate that is already Approved", () => {
    const approved = apply(openState(), {
      type: "ApproveGate",
      gateId,
      approvedBy: approverId,
      approvedAt: new Date("2026-07-20T13:00:00.000Z")
    });
    const decision = decide(approved, {
      type: "ApproveGate",
      gateId,
      approvedBy: approverId,
      approvedAt: new Date("2026-07-20T14:00:00.000Z")
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.error).toEqual({ type: "gate_already_approved" });
  });

  it("rejects approving a gate that does not exist", () => {
    const decision = decide(null, {
      type: "ApproveGate",
      gateId,
      approvedBy: approverId,
      approvedAt: new Date("2026-07-20T13:00:00.000Z")
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.error).toEqual({ type: "gate_not_found" });
  });
});
