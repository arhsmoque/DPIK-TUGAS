import type {
  ActorId,
  DispatchAttemptId,
  OrganisationId,
  ProjectId,
  ReceiptEvidenceAttemptId
} from "@foundation/ids";

export interface EvidenceItem {
  readonly fileReference: string;
  readonly description: string;
  readonly uploadedBy: ActorId;
  readonly uploadedAt: Date;
}

export interface VerificationDecision {
  readonly verifiedBy: ActorId;
  readonly verifiedAt: Date;
  readonly notes: string;
  readonly selfVerified: boolean;
}

export interface ReceiptEvidenceFacts {
  readonly receiptEvidenceAttemptId: ReceiptEvidenceAttemptId;
  readonly dispatchAttemptId: DispatchAttemptId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly replacesReceiptEvidenceAttemptId: ReceiptEvidenceAttemptId | null;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export type ReceiptEvidenceStatus =
  "Collecting" | "PendingVerification" | "Verified" | "Rejected" | "Withdrawn" | "Invalidated";

export interface ReceiptEvidenceState {
  readonly facts: ReceiptEvidenceFacts;
  readonly status: ReceiptEvidenceStatus;
  readonly items: readonly EvidenceItem[];
  readonly verification: VerificationDecision | null;
  readonly rejectionReason: string | null;
}
