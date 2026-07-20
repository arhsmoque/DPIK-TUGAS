import { err, ok, type Result } from "@foundation/result";
import type {
  CreateDeliverable,
  DeliverableCommand,
  ReviewRevision,
  SubmitRevision,
  WithdrawDeliverable
} from "./commands";
import type { DeliverableState } from "./deliverable";
import type { DeliverableEvent } from "./events";
import type { DeliverableDecisionFailure } from "./failures";

type Decision = Result<readonly DeliverableEvent[], DeliverableDecisionFailure>;

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

const OPEN_FOR_SUBMISSION_STATUSES = new Set(["Draft", "RevisionRequired"]);

function decideCreate(state: DeliverableState | null, command: CreateDeliverable): Decision {
  if (state !== null) return err({ type: "deliverable_already_exists" });
  if (!hasText(command.title)) return err({ type: "invalid_title" });
  if (!isValidDate(command.createdAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "DeliverableCreated",
      deliverableId: command.deliverableId,
      workThreadId: command.workThreadId,
      organisationId: command.organisationId,
      projectId: command.projectId,
      title: command.title.trim(),
      createdBy: command.createdBy,
      createdAt: command.createdAt
    }
  ]);
}

function decideSubmitRevision(state: DeliverableState | null, command: SubmitRevision): Decision {
  if (state === null) return err({ type: "deliverable_not_found" });
  if (!OPEN_FOR_SUBMISSION_STATUSES.has(state.status)) {
    return err({ type: "deliverable_not_open_for_submission", status: state.status });
  }
  if (
    !hasText(command.label) ||
    !hasText(command.repositoryReference) ||
    !hasText(command.changeSummary)
  ) {
    return err({ type: "invalid_revision_facts" });
  }
  if (!isValidDate(command.preparedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "RevisionSubmitted",
      revisionId: command.revisionId,
      sequence: state.revisions.length + 1,
      label: command.label.trim(),
      repositoryReference: command.repositoryReference.trim(),
      changeSummary: command.changeSummary.trim(),
      fingerprint: command.fingerprint,
      preparedBy: command.preparedBy,
      preparedAt: command.preparedAt
    }
  ]);
}

function decideReviewRevision(state: DeliverableState | null, command: ReviewRevision): Decision {
  if (state === null) return err({ type: "deliverable_not_found" });
  if (state.status !== "InReview") {
    return err({ type: "deliverable_not_in_review", status: state.status });
  }
  if (state.currentRevisionId === null) return err({ type: "no_current_revision" });
  const currentRevision = state.revisions.find((r) => r.revisionId === state.currentRevisionId);
  if (currentRevision === undefined) return err({ type: "no_current_revision" });
  if (currentRevision.preparedBy === command.decidedBy && !command.selfApproved) {
    return err({ type: "actor_is_preparer_without_self_approval_flag" });
  }
  if (!hasText(command.comments)) return err({ type: "invalid_review_comments" });
  if (!isValidDate(command.decidedAt)) return err({ type: "invalid_event_time" });

  const revisionId = state.currentRevisionId;
  const comments = command.comments.trim();

  if (command.outcome === "approved") {
    return ok([
      {
        type: "RevisionApproved",
        revisionId,
        decidedBy: command.decidedBy,
        decidedAt: command.decidedAt,
        comments,
        selfApproved: command.selfApproved
      }
    ]);
  }
  if (command.outcome === "revision_required") {
    return ok([
      {
        type: "RevisionRequired",
        revisionId,
        decidedBy: command.decidedBy,
        decidedAt: command.decidedAt,
        comments
      }
    ]);
  }
  return ok([
    {
      type: "RevisionRejected",
      revisionId,
      decidedBy: command.decidedBy,
      decidedAt: command.decidedAt,
      comments
    }
  ]);
}

function decideWithdraw(state: DeliverableState | null, command: WithdrawDeliverable): Decision {
  if (state === null) return err({ type: "deliverable_not_found" });
  if (state.status === "Withdrawn") {
    return err({ type: "deliverable_already_terminal", status: state.status });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.withdrawnAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "DeliverableWithdrawn",
      withdrawnBy: command.withdrawnBy,
      withdrawnAt: command.withdrawnAt,
      reason: command.reason.trim()
    }
  ]);
}

export function decide(state: DeliverableState | null, command: DeliverableCommand): Decision {
  switch (command.type) {
    case "CreateDeliverable":
      return decideCreate(state, command);
    case "SubmitRevision":
      return decideSubmitRevision(state, command);
    case "ReviewRevision":
      return decideReviewRevision(state, command);
    case "WithdrawDeliverable":
      return decideWithdraw(state, command);
  }
}
