import { describe, expect, it } from "vitest";
import {
  brand,
  type ActorId,
  type DeliverableId,
  type DeliverableRevisionId,
  type OrganisationId,
  type ProjectId,
  type SubmissionId
} from "@foundation/index";
import type { SubmissionCommand, CreateSubmission, AddManifestItem } from "./commands";
import { decide } from "./decide";
import { evolve } from "./evolve";
import type { SubmissionState } from "./submission";

const submissionId = brand<string, "SubmissionId">(
  "00000000-0000-4000-8000-000000000400"
) as SubmissionId;
const replacementSubmissionId = brand<string, "SubmissionId">(
  "00000000-0000-4000-8000-000000000401"
) as SubmissionId;
const organisationId = brand<string, "OrganisationId">(
  "00000000-0000-4000-8000-000000000010"
) as OrganisationId;
const projectId = brand<string, "ProjectId">("00000000-0000-4000-8000-000000000020") as ProjectId;
const preparerId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000002") as ActorId;
const signatoryId = brand<string, "ActorId">("00000000-0000-4000-8000-000000000005") as ActorId;
const deliverableId = brand<string, "DeliverableId">(
  "00000000-0000-4000-8000-000000000200"
) as DeliverableId;
const revisionId = brand<string, "DeliverableRevisionId">(
  "00000000-0000-4000-8000-000000000300"
) as DeliverableRevisionId;

const createCommand: CreateSubmission = {
  type: "CreateSubmission",
  submissionId,
  organisationId,
  projectId,
  reference: "SUB-2026-001",
  recipientType: "authority",
  recipientName: "JKR Bentong",
  packageSummary: "Drainage design submission",
  createdBy: preparerId,
  createdAt: new Date("2026-07-19T01:00:00.000Z")
};

const addItemCommand: AddManifestItem = {
  type: "AddManifestItem",
  deliverableId,
  revisionId,
  label: "Rev A",
  repositoryReference: "drive://drainage-calc-rev-a.pdf",
  addedBy: preparerId,
  addedAt: new Date("2026-07-19T02:00:00.000Z")
};

function apply(state: SubmissionState | null, command: SubmissionCommand): SubmissionState {
  const decision = decide(state, command);
  if (!decision.ok) throw new Error(`fixture decision failed: ${JSON.stringify(decision.error)}`);
  let next = state;
  for (const event of decision.value) {
    const evolved = evolve(next, event);
    if (!evolved.ok) throw new Error(`fixture evolution failed: ${JSON.stringify(evolved.error)}`);
    next = evolved.value;
  }
  return next as SubmissionState;
}

function draftState(): SubmissionState {
  return apply(null, createCommand);
}

function draftWithItemState(): SubmissionState {
  return apply(draftState(), addItemCommand);
}

function preparedState(): SubmissionState {
  return apply(draftWithItemState(), {
    type: "PrepareSubmission",
    preparedBy: preparerId,
    preparedAt: new Date("2026-07-19T03:00:00.000Z")
  });
}

describe("SB-01/02 CreateSubmission and AddManifestItem", () => {
  it("creates a Draft submission and accepts manifest items only while Draft", () => {
    const draft = draftState();
    expect(draft.status).toBe("Draft");

    const withItem = apply(draft, addItemCommand);
    expect(withItem.manifest).toHaveLength(1);
    expect(withItem.manifest[0]).toEqual(expect.objectContaining({ deliverableId, revisionId }));
  });

  it("rejects a second submission creation and blank accountability facts", () => {
    expect(decide(draftState(), createCommand)).toEqual({
      ok: false,
      error: { type: "submission_already_exists" }
    });
    expect(decide(null, { ...createCommand, recipientName: "  " })).toEqual({
      ok: false,
      error: { type: "invalid_recipient_name" }
    });
  });
});

describe("SB-05/06 PrepareSubmission and ReturnSubmissionToDraft", () => {
  it("refuses to prepare an empty manifest", () => {
    expect(
      decide(draftState(), {
        type: "PrepareSubmission",
        preparedBy: preparerId,
        preparedAt: new Date("2026-07-19T03:00:00.000Z")
      })
    ).toEqual({ ok: false, error: { type: "empty_manifest" } });
  });

  it("freezes the manifest on Prepared and rejects further AddManifestItem", () => {
    const prepared = preparedState();
    expect(prepared.status).toBe("Prepared");
    expect(decide(prepared, addItemCommand)).toEqual({
      ok: false,
      error: { type: "submission_not_draft", status: "Prepared" }
    });
  });

  it("returns to Draft, where manifest edits are allowed again", () => {
    const returned = apply(preparedState(), {
      type: "ReturnSubmissionToDraft",
      returnedBy: preparerId,
      returnedAt: new Date("2026-07-19T04:00:00.000Z"),
      reason: "Wrong revision attached"
    });
    expect(returned.status).toBe("Draft");
    expect(apply(returned, addItemCommand).manifest).toHaveLength(2);
  });
});

describe("SB-07 ApproveSubmissionForDispatch", () => {
  it("records the credential reference and moves to ReadyForDispatch", () => {
    const approved = apply(preparedState(), {
      type: "ApproveSubmissionForDispatch",
      approvedBy: signatoryId,
      approvedAt: new Date("2026-07-19T05:00:00.000Z"),
      credentialReference: "PEPC 12345"
    });
    expect(approved.status).toBe("ReadyForDispatch");
    expect(approved.dispatchApproval).toEqual(
      expect.objectContaining({ approvedBy: signatoryId, credentialReference: "PEPC 12345" })
    );
  });

  it("cannot approve a Draft submission directly", () => {
    expect(
      decide(draftWithItemState(), {
        type: "ApproveSubmissionForDispatch",
        approvedBy: signatoryId,
        approvedAt: new Date(),
        credentialReference: "PEPC 12345"
      })
    ).toEqual({ ok: false, error: { type: "submission_not_prepared", status: "Draft" } });
  });
});

describe("SB-08/09 CancelSubmission and SupersedeSubmission", () => {
  it("cancels from Draft, Prepared, or ReadyForDispatch", () => {
    const cancelled = apply(draftState(), {
      type: "CancelSubmission",
      cancelledBy: preparerId,
      cancelledAt: new Date("2026-07-19T06:00:00.000Z"),
      reason: "No longer required"
    });
    expect(cancelled.status).toBe("Cancelled");
    expect(
      decide(cancelled, {
        type: "CancelSubmission",
        cancelledBy: preparerId,
        cancelledAt: new Date(),
        reason: "again"
      })
    ).toEqual({ ok: false, error: { type: "submission_not_cancellable", status: "Cancelled" } });
  });

  it("supersedes a Prepared or ReadyForDispatch submission, linking the replacement", () => {
    const superseded = apply(preparedState(), {
      type: "SupersedeSubmission",
      supersededBy: preparerId,
      supersededAt: new Date("2026-07-19T07:00:00.000Z"),
      reason: "Client requested a revised package",
      replacementSubmissionId
    });
    expect(superseded.status).toBe("Superseded");
    expect(superseded.supersededBySubmissionId).toBe(replacementSubmissionId);
  });

  it("cannot supersede a Draft submission", () => {
    expect(
      decide(draftState(), {
        type: "SupersedeSubmission",
        supersededBy: preparerId,
        supersededAt: new Date(),
        reason: "attempt",
        replacementSubmissionId
      })
    ).toEqual({ ok: false, error: { type: "submission_not_supersedable", status: "Draft" } });
  });
});
