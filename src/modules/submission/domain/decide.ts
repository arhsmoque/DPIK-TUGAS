import { err, ok, type Result } from "@foundation/result";
import type {
  AddManifestItem,
  ApproveSubmissionForDispatch,
  CancelSubmission,
  CreateSubmission,
  PrepareSubmission,
  ReturnSubmissionToDraft,
  SubmissionCommand,
  SupersedeSubmission
} from "./commands";
import type { SubmissionEvent } from "./events";
import type { SubmissionDecisionFailure } from "./failures";
import type { SubmissionState } from "./submission";

type Decision = Result<readonly SubmissionEvent[], SubmissionDecisionFailure>;

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function decideCreate(state: SubmissionState | null, command: CreateSubmission): Decision {
  if (state !== null) return err({ type: "submission_already_exists" });
  if (!hasText(command.reference)) return err({ type: "invalid_reference" });
  if (!hasText(command.recipientName)) return err({ type: "invalid_recipient_name" });
  if (!hasText(command.packageSummary)) return err({ type: "invalid_package_summary" });
  if (!isValidDate(command.createdAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "SubmissionCreated",
      submissionId: command.submissionId,
      organisationId: command.organisationId,
      projectId: command.projectId,
      reference: command.reference.trim(),
      recipientType: command.recipientType,
      recipientName: command.recipientName.trim(),
      packageSummary: command.packageSummary.trim(),
      createdBy: command.createdBy,
      createdAt: command.createdAt
    }
  ]);
}

function decideAddManifestItem(state: SubmissionState | null, command: AddManifestItem): Decision {
  if (state === null) return err({ type: "submission_not_found" });
  if (state.status !== "Draft") return err({ type: "submission_not_draft", status: state.status });
  if (!hasText(command.label) || !hasText(command.repositoryReference)) {
    return err({ type: "invalid_manifest_item" });
  }
  if (!isValidDate(command.addedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "SubmissionManifestItemAdded",
      deliverableId: command.deliverableId,
      revisionId: command.revisionId,
      label: command.label.trim(),
      repositoryReference: command.repositoryReference.trim(),
      addedBy: command.addedBy,
      addedAt: command.addedAt
    }
  ]);
}

function decidePrepare(state: SubmissionState | null, command: PrepareSubmission): Decision {
  if (state === null) return err({ type: "submission_not_found" });
  if (state.status !== "Draft") return err({ type: "submission_not_draft", status: state.status });
  if (state.manifest.length === 0) return err({ type: "empty_manifest" });
  if (!isValidDate(command.preparedAt)) return err({ type: "invalid_event_time" });

  return ok([
    { type: "SubmissionPrepared", preparedBy: command.preparedBy, preparedAt: command.preparedAt }
  ]);
}

function decideReturnToDraft(
  state: SubmissionState | null,
  command: ReturnSubmissionToDraft
): Decision {
  if (state === null) return err({ type: "submission_not_found" });
  if (state.status !== "Prepared")
    return err({ type: "submission_not_prepared", status: state.status });
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.returnedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "SubmissionReturnedToDraft",
      returnedBy: command.returnedBy,
      returnedAt: command.returnedAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideApproveForDispatch(
  state: SubmissionState | null,
  command: ApproveSubmissionForDispatch
): Decision {
  if (state === null) return err({ type: "submission_not_found" });
  if (state.status !== "Prepared")
    return err({ type: "submission_not_prepared", status: state.status });
  if (!hasText(command.credentialReference)) return err({ type: "invalid_credential_reference" });
  if (!isValidDate(command.approvedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "SubmissionApprovedForDispatch",
      approvedBy: command.approvedBy,
      approvedAt: command.approvedAt,
      credentialReference: command.credentialReference.trim()
    }
  ]);
}

function decideCancel(state: SubmissionState | null, command: CancelSubmission): Decision {
  if (state === null) return err({ type: "submission_not_found" });
  if (
    state.status !== "Draft" &&
    state.status !== "Prepared" &&
    state.status !== "ReadyForDispatch"
  ) {
    return err({ type: "submission_not_cancellable", status: state.status });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.cancelledAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "SubmissionCancelled",
      cancelledBy: command.cancelledBy,
      cancelledAt: command.cancelledAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideSupersede(state: SubmissionState | null, command: SupersedeSubmission): Decision {
  if (state === null) return err({ type: "submission_not_found" });
  if (state.status !== "Prepared" && state.status !== "ReadyForDispatch") {
    return err({ type: "submission_not_supersedable", status: state.status });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.supersededAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "SubmissionSuperseded",
      supersededBy: command.supersededBy,
      supersededAt: command.supersededAt,
      reason: command.reason.trim(),
      replacementSubmissionId: command.replacementSubmissionId
    }
  ]);
}

export function decide(state: SubmissionState | null, command: SubmissionCommand): Decision {
  switch (command.type) {
    case "CreateSubmission":
      return decideCreate(state, command);
    case "AddManifestItem":
      return decideAddManifestItem(state, command);
    case "PrepareSubmission":
      return decidePrepare(state, command);
    case "ReturnSubmissionToDraft":
      return decideReturnToDraft(state, command);
    case "ApproveSubmissionForDispatch":
      return decideApproveForDispatch(state, command);
    case "CancelSubmission":
      return decideCancel(state, command);
    case "SupersedeSubmission":
      return decideSupersede(state, command);
  }
}
