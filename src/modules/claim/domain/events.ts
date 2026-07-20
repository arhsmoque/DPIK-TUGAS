import type {
  ActorId,
  ClaimPackageId,
  ClaimRequirementId,
  OrganisationId,
  ProjectId
} from "@foundation/ids";
import type { EvidenceKind } from "./claim";

export interface ClaimPackageCreated {
  readonly type: "ClaimPackageCreated";
  readonly claimPackageId: ClaimPackageId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly reference: string;
  readonly description: string;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface ClaimRequirementAdded {
  readonly type: "ClaimRequirementAdded";
  readonly requirementId: ClaimRequirementId;
  readonly description: string;
  readonly addedBy: ActorId;
  readonly addedAt: Date;
}

export interface ClaimEvidenceLinked {
  readonly type: "ClaimEvidenceLinked";
  readonly requirementId: ClaimRequirementId;
  readonly evidenceKind: EvidenceKind;
  readonly evidenceId: string;
  readonly linkedBy: ActorId;
  readonly linkedAt: Date;
}

export interface RequirementSatisfied {
  readonly type: "RequirementSatisfied";
  readonly requirementId: ClaimRequirementId;
  readonly evaluatedBy: ActorId;
  readonly evaluatedAt: Date;
  readonly notes: string;
}

export interface GapRecorded {
  readonly type: "GapRecorded";
  readonly requirementId: ClaimRequirementId;
  readonly evaluatedBy: ActorId;
  readonly evaluatedAt: Date;
  readonly notes: string;
}

export interface WaiverRequested {
  readonly type: "WaiverRequested";
  readonly requirementId: ClaimRequirementId;
  readonly requestedBy: ActorId;
  readonly requestedAt: Date;
  readonly reason: string;
}

export interface ClaimRequirementWaived {
  readonly type: "ClaimRequirementWaived";
  readonly requirementId: ClaimRequirementId;
  readonly approvedBy: ActorId;
  readonly approvedAt: Date;
}

export interface ClaimPackageQSVerified {
  readonly type: "ClaimPackageQSVerified";
  readonly verifiedBy: ActorId;
  readonly verifiedAt: Date;
  readonly notes: string;
}

export interface ClaimSubmissionRecorded {
  readonly type: "ClaimSubmissionRecorded";
  readonly recordedBy: ActorId;
  readonly recordedAt: Date;
}

export interface ClaimPackageClosed {
  readonly type: "ClaimPackageClosed";
  readonly closedBy: ActorId;
  readonly closedAt: Date;
}

export interface ClaimRequirementInvalidated {
  readonly type: "ClaimRequirementInvalidated";
  readonly requirementId: ClaimRequirementId;
  readonly invalidatedBy: ActorId;
  readonly invalidatedAt: Date;
  readonly reason: string;
}

export interface ClaimPackageReopenedForCorrection {
  readonly type: "ClaimPackageReopenedForCorrection";
  readonly reopenedBy: ActorId;
  readonly reopenedAt: Date;
  readonly reason: string;
}

export interface ClaimPackageCancelled {
  readonly type: "ClaimPackageCancelled";
  readonly cancelledBy: ActorId;
  readonly cancelledAt: Date;
  readonly reason: string;
}

export type ClaimEvent =
  | ClaimPackageCreated
  | ClaimRequirementAdded
  | ClaimEvidenceLinked
  | RequirementSatisfied
  | GapRecorded
  | WaiverRequested
  | ClaimRequirementWaived
  | ClaimPackageQSVerified
  | ClaimSubmissionRecorded
  | ClaimPackageClosed
  | ClaimRequirementInvalidated
  | ClaimPackageReopenedForCorrection
  | ClaimPackageCancelled;
