import type {
  ActorId,
  DispatchAttemptId,
  OrganisationId,
  ProjectId,
  ReceiptEvidenceAttemptId
} from "@foundation/ids";

export interface CreateReceiptEvidenceAttempt {
  readonly type: "CreateReceiptEvidenceAttempt";
  readonly receiptEvidenceAttemptId: ReceiptEvidenceAttemptId;
  readonly dispatchAttemptId: DispatchAttemptId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface CreateReplacementReceiptEvidenceAttempt {
  readonly type: "CreateReplacementReceiptEvidenceAttempt";
  readonly receiptEvidenceAttemptId: ReceiptEvidenceAttemptId;
  readonly dispatchAttemptId: DispatchAttemptId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly replacesReceiptEvidenceAttemptId: ReceiptEvidenceAttemptId;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface UploadReceiptEvidenceItem {
  readonly type: "UploadReceiptEvidenceItem";
  readonly fileReference: string;
  readonly description: string;
  readonly uploadedBy: ActorId;
  readonly uploadedAt: Date;
}

export interface SubmitReceiptEvidenceForVerification {
  readonly type: "SubmitReceiptEvidenceForVerification";
  readonly submittedBy: ActorId;
  readonly submittedAt: Date;
}

export interface VerifyReceiptEvidence {
  readonly type: "VerifyReceiptEvidence";
  readonly verifiedBy: ActorId;
  readonly verifiedAt: Date;
  readonly notes: string;
  // True only when the verifier is also an uploader and no other suitable
  // verifier exists (role matrix separation-of-duty exception #2), mirroring
  // deliverable's selfApproved pattern -- flagged, never silently allowed.
  readonly selfVerified: boolean;
}

export interface RejectReceiptEvidence {
  readonly type: "RejectReceiptEvidence";
  readonly rejectedBy: ActorId;
  readonly rejectedAt: Date;
  readonly reason: string;
}

export interface WithdrawReceiptEvidence {
  readonly type: "WithdrawReceiptEvidence";
  readonly withdrawnBy: ActorId;
  readonly withdrawnAt: Date;
  readonly reason: string;
}

export interface InvalidateReceiptEvidenceVerification {
  readonly type: "InvalidateReceiptEvidenceVerification";
  readonly invalidatedBy: ActorId;
  readonly invalidatedAt: Date;
  readonly reason: string;
}

export type ReceiptEvidenceCommand =
  | CreateReceiptEvidenceAttempt
  | CreateReplacementReceiptEvidenceAttempt
  | UploadReceiptEvidenceItem
  | SubmitReceiptEvidenceForVerification
  | VerifyReceiptEvidence
  | RejectReceiptEvidence
  | WithdrawReceiptEvidence
  | InvalidateReceiptEvidenceVerification;
