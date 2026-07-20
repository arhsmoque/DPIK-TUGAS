import { describe, expect, it } from "vitest";
import {
  brand,
  type ActorId,
  type ClaimPackageId,
  type ClaimRequirementId,
  type OrganisationId,
  type ProjectId
} from "@foundation/index";
import type { ClaimCommand, CreateClaimPackage } from "./commands";
import { decide } from "./decide";
import { evolve } from "./evolve";
import type { ClaimState } from "./claim";

const claimPackageId = brand<string, "ClaimPackageId">(
  "00000000-0000-4000-8000-000000000700"
) as ClaimPackageId;
const requirementOneId = brand<string, "ClaimRequirementId">(
  "00000000-0000-4000-8000-000000000710"
) as ClaimRequirementId;
const requirementTwoId = brand<string, "ClaimRequirementId">(
  "00000000-0000-4000-8000-000000000711"
) as ClaimRequirementId;
const organisationId = brand<string, "OrganisationId">(
  "00000000-0000-4000-8000-000000000010"
) as OrganisationId;
const projectId = brand<string, "ProjectId">("00000000-0000-4000-8000-000000000020") as ProjectId;
const qsId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000009") as ActorId;
const financeId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000010") as ActorId;
const requesterId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000011") as ActorId;

const createCommand: CreateClaimPackage = {
  type: "CreateClaimPackage",
  claimPackageId,
  organisationId,
  projectId,
  reference: "CLAIM-2026-001",
  description: "Progress claim 3",
  createdBy: qsId,
  createdAt: new Date("2026-07-19T15:00:00.000Z")
};

function apply(state: ClaimState | null, command: ClaimCommand): ClaimState {
  const decision = decide(state, command);
  if (!decision.ok) throw new Error(`fixture decision failed: ${JSON.stringify(decision.error)}`);
  let next = state;
  for (const event of decision.value) {
    const evolved = evolve(next, event);
    if (!evolved.ok) throw new Error(`fixture evolution failed: ${JSON.stringify(evolved.error)}`);
    next = evolved.value;
  }
  return next as ClaimState;
}

function openState(): ClaimState {
  return apply(null, createCommand);
}

describe("CL-01/02 create and add requirement", () => {
  it("starts Open + EvidenceIncomplete with no requirements", () => {
    const state = openState();
    expect(state.lifecycle).toBe("Open");
    expect(state.readiness).toBe("EvidenceIncomplete");
    expect(state.requirements).toHaveLength(0);
  });

  it("adding an Unsatisfied requirement keeps readiness EvidenceIncomplete", () => {
    const withRequirement = apply(openState(), {
      type: "AddClaimRequirement",
      requirementId: requirementOneId,
      description: "Stamped delivery order",
      addedBy: qsId,
      addedAt: new Date("2026-07-19T15:10:00.000Z")
    });
    expect(withRequirement.readiness).toBe("EvidenceIncomplete");
    expect(withRequirement.requirements[0]?.status).toBe("Unsatisfied");
  });
});

describe("Readiness derivation", () => {
  function withTwoRequirements(): ClaimState {
    const withFirst = apply(openState(), {
      type: "AddClaimRequirement",
      requirementId: requirementOneId,
      description: "Stamped delivery order",
      addedBy: qsId,
      addedAt: new Date("2026-07-19T15:10:00.000Z")
    });
    return apply(withFirst, {
      type: "AddClaimRequirement",
      requirementId: requirementTwoId,
      description: "Approved as-built drawing",
      addedBy: qsId,
      addedAt: new Date("2026-07-19T15:11:00.000Z")
    });
  }

  it("only becomes ReadyForQSReview when every requirement is Satisfied or Waived", () => {
    const state = withTwoRequirements();
    const oneSatisfied = apply(state, {
      type: "EvaluateClaimRequirement",
      requirementId: requirementOneId,
      outcome: "satisfied",
      evaluatedBy: qsId,
      evaluatedAt: new Date("2026-07-19T15:20:00.000Z"),
      notes: "Stamp and date confirmed"
    });
    expect(oneSatisfied.readiness).toBe("EvidenceIncomplete");

    const requested = apply(oneSatisfied, {
      type: "RequestClaimRequirementWaiver",
      requirementId: requirementTwoId,
      requestedBy: requesterId,
      requestedAt: new Date("2026-07-19T15:25:00.000Z"),
      reason: "Drawing pending client sign-off, claim deadline is today"
    });
    const bothQualify = apply(requested, {
      type: "ApproveClaimRequirementWaiver",
      requirementId: requirementTwoId,
      approvedBy: financeId,
      approvedAt: new Date("2026-07-19T15:30:00.000Z")
    });
    expect(bothQualify.readiness).toBe("ReadyForQSReview");
  });

  it("a GapRecorded evaluation returns the requirement to Unsatisfied", () => {
    const withGap = apply(withTwoRequirements(), {
      type: "EvaluateClaimRequirement",
      requirementId: requirementOneId,
      outcome: "gap",
      evaluatedBy: qsId,
      evaluatedAt: new Date("2026-07-19T15:20:00.000Z"),
      notes: "Stamp illegible, needs replacement"
    });
    expect(withGap.requirements[0]).toEqual(
      expect.objectContaining({
        status: "Unsatisfied",
        gapNote: "Stamp illegible, needs replacement"
      })
    );
    expect(withGap.readiness).toBe("EvidenceIncomplete");
  });

  it("invalidating a Satisfied requirement drops readiness back to EvidenceIncomplete", () => {
    const state = withTwoRequirements();
    const satisfiedBoth = apply(
      apply(state, {
        type: "EvaluateClaimRequirement",
        requirementId: requirementOneId,
        outcome: "satisfied",
        evaluatedBy: qsId,
        evaluatedAt: new Date("2026-07-19T15:20:00.000Z"),
        notes: "Confirmed"
      }),
      {
        type: "EvaluateClaimRequirement",
        requirementId: requirementTwoId,
        outcome: "satisfied",
        evaluatedBy: qsId,
        evaluatedAt: new Date("2026-07-19T15:21:00.000Z"),
        notes: "Confirmed"
      }
    );
    expect(satisfiedBoth.readiness).toBe("ReadyForQSReview");

    const invalidated = apply(satisfiedBoth, {
      type: "InvalidateClaimEvidence",
      requirementId: requirementOneId,
      invalidatedBy: qsId,
      invalidatedAt: new Date("2026-07-19T16:00:00.000Z"),
      reason: "Delivery order later found to reference a different package"
    });
    expect(invalidated.readiness).toBe("EvidenceIncomplete");
    expect(invalidated.requirements[0]?.status).toBe("Invalidated");
  });
});

describe("Waiver requester/approver separation", () => {
  it("rejects the requester approving their own waiver", () => {
    const withRequirement = apply(openState(), {
      type: "AddClaimRequirement",
      requirementId: requirementOneId,
      description: "Stamped delivery order",
      addedBy: qsId,
      addedAt: new Date("2026-07-19T15:10:00.000Z")
    });
    const requested = apply(withRequirement, {
      type: "RequestClaimRequirementWaiver",
      requirementId: requirementOneId,
      requestedBy: requesterId,
      requestedAt: new Date("2026-07-19T15:25:00.000Z"),
      reason: "Deadline today"
    });
    expect(
      decide(requested, {
        type: "ApproveClaimRequirementWaiver",
        requirementId: requirementOneId,
        approvedBy: requesterId,
        approvedAt: new Date()
      })
    ).toEqual({ ok: false, error: { type: "actor_is_waiver_requester" } });
  });
});

describe("Readiness -> QS verification -> submission -> closure", () => {
  it("requires ReadyForQSReview before VerifyClaimPackage, and QSVerified before submission", () => {
    const withRequirement = apply(openState(), {
      type: "AddClaimRequirement",
      requirementId: requirementOneId,
      description: "Stamped delivery order",
      addedBy: qsId,
      addedAt: new Date("2026-07-19T15:10:00.000Z")
    });
    expect(
      decide(withRequirement, {
        type: "VerifyClaimPackage",
        verifiedBy: qsId,
        verifiedAt: new Date(),
        notes: "premature"
      })
    ).toEqual({
      ok: false,
      error: { type: "claim_not_ready_for_qs_review", readiness: "EvidenceIncomplete" }
    });

    const satisfied = apply(withRequirement, {
      type: "EvaluateClaimRequirement",
      requirementId: requirementOneId,
      outcome: "satisfied",
      evaluatedBy: qsId,
      evaluatedAt: new Date("2026-07-19T15:20:00.000Z"),
      notes: "Confirmed"
    });
    expect(
      decide(satisfied, {
        type: "RecordClaimSubmission",
        recordedBy: qsId,
        recordedAt: new Date()
      })
    ).toEqual({
      ok: false,
      error: { type: "claim_not_qs_verified", readiness: "ReadyForQSReview" }
    });

    const verified = apply(satisfied, {
      type: "VerifyClaimPackage",
      verifiedBy: qsId,
      verifiedAt: new Date("2026-07-19T15:30:00.000Z"),
      notes: "All requirements met"
    });
    expect(verified.readiness).toBe("QSVerified");

    const submitted = apply(verified, {
      type: "RecordClaimSubmission",
      recordedBy: qsId,
      recordedAt: new Date("2026-07-19T15:35:00.000Z")
    });
    expect(submitted.lifecycle).toBe("Submitted");

    const closed = apply(submitted, {
      type: "CloseClaimPackage",
      closedBy: qsId,
      closedAt: new Date("2026-07-19T16:00:00.000Z")
    });
    expect(closed.lifecycle).toBe("Closed");
  });

  it("reopens Submitted/Closed for correction, resetting to Open + EvidenceIncomplete", () => {
    const withRequirement = apply(openState(), {
      type: "AddClaimRequirement",
      requirementId: requirementOneId,
      description: "Stamped delivery order",
      addedBy: qsId,
      addedAt: new Date("2026-07-19T15:10:00.000Z")
    });
    const verified = apply(
      apply(withRequirement, {
        type: "EvaluateClaimRequirement",
        requirementId: requirementOneId,
        outcome: "satisfied",
        evaluatedBy: qsId,
        evaluatedAt: new Date("2026-07-19T15:20:00.000Z"),
        notes: "Confirmed"
      }),
      {
        type: "VerifyClaimPackage",
        verifiedBy: qsId,
        verifiedAt: new Date("2026-07-19T15:30:00.000Z"),
        notes: "OK"
      }
    );
    const submitted = apply(verified, {
      type: "RecordClaimSubmission",
      recordedBy: qsId,
      recordedAt: new Date("2026-07-19T15:35:00.000Z")
    });
    const reopened = apply(submitted, {
      type: "ReopenClaimPackageForCorrection",
      reopenedBy: qsId,
      reopenedAt: new Date("2026-07-20T09:00:00.000Z"),
      reason: "Client disputed one line item"
    });
    expect(reopened.lifecycle).toBe("Open");
    expect(reopened.readiness).toBe("EvidenceIncomplete");
    expect(reopened.qsVerification).toBeNull();
    // The requirement's own evaluation history is preserved, not erased.
    expect(reopened.requirements[0]?.status).toBe("Satisfied");
  });
});

describe("CancelClaimPackage", () => {
  it("cancels only while Open", () => {
    const cancelled = apply(openState(), {
      type: "CancelClaimPackage",
      cancelledBy: qsId,
      cancelledAt: new Date("2026-07-19T15:05:00.000Z"),
      reason: "Superseded by a combined claim"
    });
    expect(cancelled.lifecycle).toBe("Cancelled");
  });
});
