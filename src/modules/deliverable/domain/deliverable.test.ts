import { describe, expect, it } from "vitest";
import {
  brand,
  type ActorId,
  type DeliverableId,
  type DeliverableRevisionId,
  type OrganisationId,
  type ProjectId,
  type WorkThreadId
} from "@foundation/index";
import type { DeliverableCommand, CreateDeliverable, SubmitRevision } from "./commands";
import { decide } from "./decide";
import { evolve } from "./evolve";
import type { DeliverableState } from "./deliverable";

const deliverableId = brand<string, "DeliverableId">(
  "00000000-0000-4000-8000-000000000200"
) as DeliverableId;
const workThreadId = brand<string, "WorkThreadId">(
  "00000000-0000-4000-8000-000000000100"
) as WorkThreadId;
const organisationId = brand<string, "OrganisationId">(
  "00000000-0000-4000-8000-000000000010"
) as OrganisationId;
const projectId = brand<string, "ProjectId">("00000000-0000-4000-8000-000000000020") as ProjectId;
const ownerId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000001") as ActorId;
const preparerId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000002") as ActorId;
const reviewerId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000003") as ActorId;
const revisionOneId = brand<string, "DeliverableRevisionId">(
  "00000000-0000-4000-8000-000000000300"
) as DeliverableRevisionId;
const revisionTwoId = brand<string, "DeliverableRevisionId">(
  "00000000-0000-4000-8000-000000000301"
) as DeliverableRevisionId;

const createCommand: CreateDeliverable = {
  type: "CreateDeliverable",
  deliverableId,
  workThreadId,
  organisationId,
  projectId,
  title: "Drainage calculation pack",
  createdBy: ownerId,
  createdAt: new Date("2026-07-17T01:00:00.000Z")
};

function apply(state: DeliverableState | null, command: DeliverableCommand): DeliverableState {
  const decision = decide(state, command);
  if (!decision.ok) throw new Error(`fixture decision failed: ${JSON.stringify(decision.error)}`);
  let next = state;
  for (const event of decision.value) {
    const evolved = evolve(next, event);
    if (!evolved.ok) throw new Error(`fixture evolution failed: ${JSON.stringify(evolved.error)}`);
    next = evolved.value;
  }
  return next as DeliverableState;
}

const submitCommand: SubmitRevision = {
  type: "SubmitRevision",
  revisionId: revisionOneId,
  label: "Rev A",
  repositoryReference: "drive://drainage-calc-rev-a.pdf",
  changeSummary: "Initial issue",
  fingerprint: null,
  preparedBy: preparerId,
  preparedAt: new Date("2026-07-17T02:00:00.000Z")
};

function draftState(): DeliverableState {
  return apply(null, createCommand);
}

function inReviewState(): DeliverableState {
  return apply(draftState(), submitCommand);
}

describe("DL-01 CreateDeliverable and SubmitRevision", () => {
  it("creates a Draft deliverable and enters InReview on first submission", () => {
    const draft = draftState();
    expect(draft.status).toBe("Draft");

    const inReview = apply(draft, submitCommand);
    expect(inReview.status).toBe("InReview");
    expect(inReview.currentRevisionId).toBe(revisionOneId);
    expect(inReview.revisions).toHaveLength(1);
    expect(inReview.revisions[0]).toEqual(
      expect.objectContaining({ sequence: 1, supersededBy: null })
    );
  });

  it("rejects submission while already InReview", () => {
    expect(decide(inReviewState(), submitCommand)).toEqual({
      ok: false,
      error: { type: "deliverable_not_open_for_submission", status: "InReview" }
    });
  });
});

describe("DL-02 ReviewRevision", () => {
  it("approves, recording the reviewer and leaving the earlier revision intact", () => {
    const inReview = inReviewState();
    const approved = apply(inReview, {
      type: "ReviewRevision",
      outcome: "approved",
      comments: "Meets the design brief",
      decidedBy: reviewerId,
      decidedAt: new Date("2026-07-17T03:00:00.000Z"),
      selfApproved: false
    });
    expect(approved.status).toBe("Approved");
    expect(approved.lastReview).toEqual(
      expect.objectContaining({ revisionId: revisionOneId, selfApproved: false })
    );
    expect(approved.revisions[0]).toEqual(inReview.revisions[0]);
  });

  it("blocks the preparer from reviewing their own revision without the self-approval flag", () => {
    const inReview = inReviewState();
    expect(
      decide(inReview, {
        type: "ReviewRevision",
        outcome: "approved",
        comments: "Looks fine",
        decidedBy: preparerId,
        decidedAt: new Date("2026-07-17T03:00:00.000Z"),
        selfApproved: false
      })
    ).toEqual({ ok: false, error: { type: "actor_is_preparer_without_self_approval_flag" } });

    const selfApproved = apply(inReview, {
      type: "ReviewRevision",
      outcome: "approved",
      comments: "No second reviewer available this week",
      decidedBy: preparerId,
      decidedAt: new Date("2026-07-17T03:00:00.000Z"),
      selfApproved: true
    });
    expect(selfApproved.lastReview?.selfApproved).toBe(true);
  });

  it("revision-required preserves the earlier revision and returns to a submittable state", () => {
    const inReview = inReviewState();
    const revisionRequired = apply(inReview, {
      type: "ReviewRevision",
      outcome: "revision_required",
      comments: "Missing appendix C",
      decidedBy: reviewerId,
      decidedAt: new Date("2026-07-17T03:00:00.000Z"),
      selfApproved: false
    });
    expect(revisionRequired.status).toBe("RevisionRequired");

    const resubmitted = apply(revisionRequired, {
      type: "SubmitRevision",
      revisionId: revisionTwoId,
      label: "Rev B",
      repositoryReference: "drive://drainage-calc-rev-b.pdf",
      changeSummary: "Added appendix C",
      fingerprint: null,
      preparedBy: preparerId,
      preparedAt: new Date("2026-07-18T02:00:00.000Z")
    });
    expect(resubmitted.status).toBe("InReview");
    expect(resubmitted.revisions).toHaveLength(2);
    expect(resubmitted.revisions[0]).toEqual(
      expect.objectContaining({ revisionId: revisionOneId, supersededBy: revisionTwoId })
    );
    expect(resubmitted.revisions[1]).toEqual(
      expect.objectContaining({ revisionId: revisionTwoId, supersededBy: null, sequence: 2 })
    );
  });
});

describe("DL-03 WithdrawDeliverable", () => {
  it("withdraws with a reason and refuses a second withdrawal", () => {
    const withdrawn = apply(draftState(), {
      type: "WithdrawDeliverable",
      withdrawnBy: ownerId,
      withdrawnAt: new Date("2026-07-19T00:00:00.000Z"),
      reason: "Scope removed from contract"
    });
    expect(withdrawn.status).toBe("Withdrawn");

    expect(
      decide(withdrawn, {
        type: "WithdrawDeliverable",
        withdrawnBy: ownerId,
        withdrawnAt: new Date(),
        reason: "again"
      })
    ).toEqual({ ok: false, error: { type: "deliverable_already_terminal", status: "Withdrawn" } });
  });
});
