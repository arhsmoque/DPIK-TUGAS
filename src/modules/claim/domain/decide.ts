import { err, ok, type Result } from "@foundation/result";
import type {
  AddClaimRequirement,
  ApproveClaimRequirementWaiver,
  CancelClaimPackage,
  ClaimCommand,
  CloseClaimPackage,
  CreateClaimPackage,
  EvaluateClaimRequirement,
  InvalidateClaimEvidence,
  LinkClaimEvidence,
  RecordClaimSubmission,
  ReopenClaimPackageForCorrection,
  RequestClaimRequirementWaiver,
  VerifyClaimPackage
} from "./commands";
import type { ClaimState } from "./claim";
import type { ClaimEvent } from "./events";
import type { ClaimDecisionFailure } from "./failures";

type Decision = Result<readonly ClaimEvent[], ClaimDecisionFailure>;

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function findRequirement(state: ClaimState, requirementId: string) {
  return state.requirements.find((r) => r.requirementId === requirementId);
}

function decideCreate(state: ClaimState | null, command: CreateClaimPackage): Decision {
  if (state !== null) return err({ type: "claim_already_exists" });
  if (!hasText(command.reference)) return err({ type: "invalid_reference" });
  if (!hasText(command.description)) return err({ type: "invalid_description" });
  if (!isValidDate(command.createdAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ClaimPackageCreated",
      claimPackageId: command.claimPackageId,
      organisationId: command.organisationId,
      projectId: command.projectId,
      reference: command.reference.trim(),
      description: command.description.trim(),
      createdBy: command.createdBy,
      createdAt: command.createdAt
    }
  ]);
}

function decideAddRequirement(state: ClaimState | null, command: AddClaimRequirement): Decision {
  if (state === null) return err({ type: "claim_not_found" });
  if (state.lifecycle !== "Open")
    return err({ type: "claim_not_open", lifecycle: state.lifecycle });
  if (!hasText(command.description)) return err({ type: "invalid_description" });
  if (!isValidDate(command.addedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ClaimRequirementAdded",
      requirementId: command.requirementId,
      description: command.description.trim(),
      addedBy: command.addedBy,
      addedAt: command.addedAt
    }
  ]);
}

function decideLinkEvidence(state: ClaimState | null, command: LinkClaimEvidence): Decision {
  if (state === null) return err({ type: "claim_not_found" });
  const requirement = findRequirement(state, command.requirementId);
  if (requirement === undefined) return err({ type: "requirement_not_found" });
  if (!hasText(command.evidenceId)) return err({ type: "invalid_evidence_reference" });
  if (!isValidDate(command.linkedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ClaimEvidenceLinked",
      requirementId: command.requirementId,
      evidenceKind: command.evidenceKind,
      evidenceId: command.evidenceId,
      linkedBy: command.linkedBy,
      linkedAt: command.linkedAt
    }
  ]);
}

function decideEvaluate(state: ClaimState | null, command: EvaluateClaimRequirement): Decision {
  if (state === null) return err({ type: "claim_not_found" });
  const requirement = findRequirement(state, command.requirementId);
  if (requirement === undefined) return err({ type: "requirement_not_found" });
  if (requirement.status !== "Unsatisfied") {
    return err({ type: "requirement_not_unsatisfied", status: requirement.status });
  }
  if (!hasText(command.notes)) return err({ type: "invalid_notes" });
  if (!isValidDate(command.evaluatedAt)) return err({ type: "invalid_event_time" });

  if (command.outcome === "satisfied") {
    return ok([
      {
        type: "RequirementSatisfied",
        requirementId: command.requirementId,
        evaluatedBy: command.evaluatedBy,
        evaluatedAt: command.evaluatedAt,
        notes: command.notes.trim()
      }
    ]);
  }
  return ok([
    {
      type: "GapRecorded",
      requirementId: command.requirementId,
      evaluatedBy: command.evaluatedBy,
      evaluatedAt: command.evaluatedAt,
      notes: command.notes.trim()
    }
  ]);
}

function decideRequestWaiver(
  state: ClaimState | null,
  command: RequestClaimRequirementWaiver
): Decision {
  if (state === null) return err({ type: "claim_not_found" });
  const requirement = findRequirement(state, command.requirementId);
  if (requirement === undefined) return err({ type: "requirement_not_found" });
  if (requirement.status !== "Unsatisfied") {
    return err({ type: "requirement_not_unsatisfied", status: requirement.status });
  }
  if (requirement.waiver !== null && requirement.waiver.approvedBy === null) {
    return err({ type: "waiver_already_pending" });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.requestedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "WaiverRequested",
      requirementId: command.requirementId,
      requestedBy: command.requestedBy,
      requestedAt: command.requestedAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideApproveWaiver(
  state: ClaimState | null,
  command: ApproveClaimRequirementWaiver
): Decision {
  if (state === null) return err({ type: "claim_not_found" });
  const requirement = findRequirement(state, command.requirementId);
  if (requirement === undefined) return err({ type: "requirement_not_found" });
  if (requirement.waiver === null || requirement.waiver.approvedBy !== null) {
    return err({ type: "no_pending_waiver" });
  }
  // BOM-CLAIM-003/matrix: waiver requester and approver are separated.
  if (requirement.waiver.requestedBy === command.approvedBy) {
    return err({ type: "actor_is_waiver_requester" });
  }
  if (!isValidDate(command.approvedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ClaimRequirementWaived",
      requirementId: command.requirementId,
      approvedBy: command.approvedBy,
      approvedAt: command.approvedAt
    }
  ]);
}

function decideVerify(state: ClaimState | null, command: VerifyClaimPackage): Decision {
  if (state === null) return err({ type: "claim_not_found" });
  if (state.readiness !== "ReadyForQSReview") {
    return err({ type: "claim_not_ready_for_qs_review", readiness: state.readiness });
  }
  if (!hasText(command.notes)) return err({ type: "invalid_notes" });
  if (!isValidDate(command.verifiedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ClaimPackageQSVerified",
      verifiedBy: command.verifiedBy,
      verifiedAt: command.verifiedAt,
      notes: command.notes.trim()
    }
  ]);
}

function decideRecordSubmission(
  state: ClaimState | null,
  command: RecordClaimSubmission
): Decision {
  if (state === null) return err({ type: "claim_not_found" });
  if (state.lifecycle !== "Open")
    return err({ type: "claim_not_open", lifecycle: state.lifecycle });
  if (state.readiness !== "QSVerified") {
    return err({ type: "claim_not_qs_verified", readiness: state.readiness });
  }
  if (!isValidDate(command.recordedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ClaimSubmissionRecorded",
      recordedBy: command.recordedBy,
      recordedAt: command.recordedAt
    }
  ]);
}

function decideClose(state: ClaimState | null, command: CloseClaimPackage): Decision {
  if (state === null) return err({ type: "claim_not_found" });
  if (state.lifecycle !== "Submitted") {
    return err({ type: "claim_not_submitted", lifecycle: state.lifecycle });
  }
  if (!isValidDate(command.closedAt)) return err({ type: "invalid_event_time" });

  return ok([
    { type: "ClaimPackageClosed", closedBy: command.closedBy, closedAt: command.closedAt }
  ]);
}

function decideInvalidate(state: ClaimState | null, command: InvalidateClaimEvidence): Decision {
  if (state === null) return err({ type: "claim_not_found" });
  const requirement = findRequirement(state, command.requirementId);
  if (requirement === undefined) return err({ type: "requirement_not_found" });
  if (requirement.status !== "Satisfied" && requirement.status !== "Waived") {
    return err({ type: "requirement_not_qualifying", status: requirement.status });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.invalidatedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ClaimRequirementInvalidated",
      requirementId: command.requirementId,
      invalidatedBy: command.invalidatedBy,
      invalidatedAt: command.invalidatedAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideReopen(
  state: ClaimState | null,
  command: ReopenClaimPackageForCorrection
): Decision {
  if (state === null) return err({ type: "claim_not_found" });
  if (state.lifecycle !== "Submitted" && state.lifecycle !== "Closed") {
    return err({ type: "claim_not_correctable", lifecycle: state.lifecycle });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.reopenedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ClaimPackageReopenedForCorrection",
      reopenedBy: command.reopenedBy,
      reopenedAt: command.reopenedAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideCancel(state: ClaimState | null, command: CancelClaimPackage): Decision {
  if (state === null) return err({ type: "claim_not_found" });
  if (state.lifecycle !== "Open")
    return err({ type: "claim_not_cancellable", lifecycle: state.lifecycle });
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.cancelledAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "ClaimPackageCancelled",
      cancelledBy: command.cancelledBy,
      cancelledAt: command.cancelledAt,
      reason: command.reason.trim()
    }
  ]);
}

export function decide(state: ClaimState | null, command: ClaimCommand): Decision {
  switch (command.type) {
    case "CreateClaimPackage":
      return decideCreate(state, command);
    case "AddClaimRequirement":
      return decideAddRequirement(state, command);
    case "LinkClaimEvidence":
      return decideLinkEvidence(state, command);
    case "EvaluateClaimRequirement":
      return decideEvaluate(state, command);
    case "RequestClaimRequirementWaiver":
      return decideRequestWaiver(state, command);
    case "ApproveClaimRequirementWaiver":
      return decideApproveWaiver(state, command);
    case "VerifyClaimPackage":
      return decideVerify(state, command);
    case "RecordClaimSubmission":
      return decideRecordSubmission(state, command);
    case "CloseClaimPackage":
      return decideClose(state, command);
    case "InvalidateClaimEvidence":
      return decideInvalidate(state, command);
    case "ReopenClaimPackageForCorrection":
      return decideReopen(state, command);
    case "CancelClaimPackage":
      return decideCancel(state, command);
  }
}
