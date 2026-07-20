import type {
  ActorId,
  DeliverableId,
  DeliverableRevisionId,
  OrganisationId,
  ProjectId,
  SubmissionId
} from "@foundation/ids";

export type RecipientType = "client" | "authority";

export interface ManifestItem {
  readonly deliverableId: DeliverableId;
  readonly revisionId: DeliverableRevisionId;
  readonly label: string;
  readonly repositoryReference: string;
  readonly addedBy: ActorId;
  readonly addedAt: Date;
}

export interface DispatchApproval {
  readonly approvedBy: ActorId;
  readonly approvedAt: Date;
  // Free-text reference to the Authorized Signatory credential exercised
  // (e.g. "PEPC 12345") -- the domain records it, it does not verify it.
  // Verifying the credential is valid and current is an application-layer /
  // Configuration concern (04_ROLE_AND_AUTHORIZATION_MATRIX.md).
  readonly credentialReference: string;
}

export interface SubmissionFacts {
  readonly submissionId: SubmissionId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly reference: string;
  readonly recipientType: RecipientType;
  readonly recipientName: string;
  readonly packageSummary: string;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export type SubmissionStatus =
  "Draft" | "Prepared" | "ReadyForDispatch" | "Cancelled" | "Superseded";

export interface SubmissionState {
  readonly facts: SubmissionFacts;
  readonly status: SubmissionStatus;
  // Frozen manifest never rewrites once Prepared (SB-05/BOM-SUB-002); a later
  // Deliverable revision does not silently alter what a Submission already
  // named.
  readonly manifest: readonly ManifestItem[];
  readonly dispatchApproval: DispatchApproval | null;
  readonly supersededBySubmissionId: SubmissionId | null;
}
