import type {
  ActorId,
  ClaimPackageId,
  ClaimRequirementId,
  OrganisationId,
  ProjectId
} from "@foundation/ids";
import type { EvidenceKind } from "./claim";

export interface CreateClaimPackage {
  readonly type: "CreateClaimPackage";
  readonly claimPackageId: ClaimPackageId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly reference: string;
  readonly description: string;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface AddClaimRequirement {
  readonly type: "AddClaimRequirement";
  readonly requirementId: ClaimRequirementId;
  readonly description: string;
  readonly addedBy: ActorId;
  readonly addedAt: Date;
}

export interface LinkClaimEvidence {
  readonly type: "LinkClaimEvidence";
  readonly requirementId: ClaimRequirementId;
  readonly evidenceKind: EvidenceKind;
  readonly evidenceId: string;
  readonly linkedBy: ActorId;
  readonly linkedAt: Date;
}

export type EvaluationOutcome = "satisfied" | "gap";

export interface EvaluateClaimRequirement {
  readonly type: "EvaluateClaimRequirement";
  readonly requirementId: ClaimRequirementId;
  readonly outcome: EvaluationOutcome;
  readonly evaluatedBy: ActorId;
  readonly evaluatedAt: Date;
  readonly notes: string;
}

export interface RequestClaimRequirementWaiver {
  readonly type: "RequestClaimRequirementWaiver";
  readonly requirementId: ClaimRequirementId;
  readonly requestedBy: ActorId;
  readonly requestedAt: Date;
  readonly reason: string;
}

export interface ApproveClaimRequirementWaiver {
  readonly type: "ApproveClaimRequirementWaiver";
  readonly requirementId: ClaimRequirementId;
  readonly approvedBy: ActorId;
  readonly approvedAt: Date;
}

export interface VerifyClaimPackage {
  readonly type: "VerifyClaimPackage";
  readonly verifiedBy: ActorId;
  readonly verifiedAt: Date;
  readonly notes: string;
}

export interface RecordClaimSubmission {
  readonly type: "RecordClaimSubmission";
  readonly recordedBy: ActorId;
  readonly recordedAt: Date;
}

export interface CloseClaimPackage {
  readonly type: "CloseClaimPackage";
  readonly closedBy: ActorId;
  readonly closedAt: Date;
}

export interface InvalidateClaimEvidence {
  readonly type: "InvalidateClaimEvidence";
  readonly requirementId: ClaimRequirementId;
  readonly invalidatedBy: ActorId;
  readonly invalidatedAt: Date;
  readonly reason: string;
}

export interface ReopenClaimPackageForCorrection {
  readonly type: "ReopenClaimPackageForCorrection";
  readonly reopenedBy: ActorId;
  readonly reopenedAt: Date;
  readonly reason: string;
}

export interface CancelClaimPackage {
  readonly type: "CancelClaimPackage";
  readonly cancelledBy: ActorId;
  readonly cancelledAt: Date;
  readonly reason: string;
}

export type ClaimCommand =
  | CreateClaimPackage
  | AddClaimRequirement
  | LinkClaimEvidence
  | EvaluateClaimRequirement
  | RequestClaimRequirementWaiver
  | ApproveClaimRequirementWaiver
  | VerifyClaimPackage
  | RecordClaimSubmission
  | CloseClaimPackage
  | InvalidateClaimEvidence
  | ReopenClaimPackageForCorrection
  | CancelClaimPackage;
