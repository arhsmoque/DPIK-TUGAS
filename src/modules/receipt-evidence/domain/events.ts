import type {
  ActorId,
  DispatchAttemptId,
  OrganisationId,
  ProjectId,
  ReceiptEvidenceAttemptId
} from "@foundation/ids";

export interface ReceiptEvidenceAttemptCreated {
  readonly type: "ReceiptEvidenceAttemptCreated";
  readonly receiptEvidenceAttemptId: ReceiptEvidenceAttemptId;
  readonly dispatchAttemptId: DispatchAttemptId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly replacesReceiptEvidenceAttemptId: ReceiptEvidenceAttemptId | null;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface ReplacementReceiptEvidenceCreated {
  readonly type: "ReplacementReceiptEvidenceCreated";
  readonly receiptEvidenceAttemptId: ReceiptEvidenceAttemptId;
  readonly dispatchAttemptId: DispatchAttemptId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly replacesReceiptEvidenceAttemptId: ReceiptEvidenceAttemptId;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface ReceiptEvidenceItemUploaded {
  readonly type: "ReceiptEvidenceItemUploaded";
  readonly fileReference: string;
  readonly description: string;
  readonly uploadedBy: ActorId;
  readonly uploadedAt: Date;
}

export interface ReceiptEvidenceSubmittedForVerification {
  readonly type: "ReceiptEvidenceSubmittedForVerification";
  readonly submittedBy: ActorId;
  readonly submittedAt: Date;
}

export interface ReceiptEvidenceVerified {
  readonly type: "ReceiptEvidenceVerified";
  readonly verifiedBy: ActorId;
  readonly verifiedAt: Date;
  readonly notes: string;
  readonly selfVerified: boolean;
}

export interface ReceiptEvidenceRejected {
  readonly type: "ReceiptEvidenceRejected";
  readonly rejectedBy: ActorId;
  readonly rejectedAt: Date;
  readonly reason: string;
}

export interface ReceiptEvidenceWithdrawn {
  readonly type: "ReceiptEvidenceWithdrawn";
  readonly withdrawnBy: ActorId;
  readonly withdrawnAt: Date;
  readonly reason: string;
}

export interface ReceiptEvidenceVerificationInvalidated {
  readonly type: "ReceiptEvidenceVerificationInvalidated";
  readonly invalidatedBy: ActorId;
  readonly invalidatedAt: Date;
  readonly reason: string;
}

export type ReceiptEvidenceEvent =
  | ReceiptEvidenceAttemptCreated
  | ReplacementReceiptEvidenceCreated
  | ReceiptEvidenceItemUploaded
  | ReceiptEvidenceSubmittedForVerification
  | ReceiptEvidenceVerified
  | ReceiptEvidenceRejected
  | ReceiptEvidenceWithdrawn
  | ReceiptEvidenceVerificationInvalidated;
