import type {
  ActorId,
  DeliverableId,
  DeliverableRevisionId,
  OrganisationId,
  ProjectId,
  SubmissionId
} from "@foundation/ids";
import type { RecipientType } from "./submission";

export interface CreateSubmission {
  readonly type: "CreateSubmission";
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

export interface AddManifestItem {
  readonly type: "AddManifestItem";
  readonly deliverableId: DeliverableId;
  readonly revisionId: DeliverableRevisionId;
  readonly label: string;
  readonly repositoryReference: string;
  readonly addedBy: ActorId;
  readonly addedAt: Date;
}

export interface PrepareSubmission {
  readonly type: "PrepareSubmission";
  readonly preparedBy: ActorId;
  readonly preparedAt: Date;
}

export interface ReturnSubmissionToDraft {
  readonly type: "ReturnSubmissionToDraft";
  readonly returnedBy: ActorId;
  readonly returnedAt: Date;
  readonly reason: string;
}

export interface ApproveSubmissionForDispatch {
  readonly type: "ApproveSubmissionForDispatch";
  readonly approvedBy: ActorId;
  readonly approvedAt: Date;
  readonly credentialReference: string;
}

export interface CancelSubmission {
  readonly type: "CancelSubmission";
  readonly cancelledBy: ActorId;
  readonly cancelledAt: Date;
  readonly reason: string;
}

export interface SupersedeSubmission {
  readonly type: "SupersedeSubmission";
  readonly supersededBy: ActorId;
  readonly supersededAt: Date;
  readonly reason: string;
  readonly replacementSubmissionId: SubmissionId;
}

export type SubmissionCommand =
  | CreateSubmission
  | AddManifestItem
  | PrepareSubmission
  | ReturnSubmissionToDraft
  | ApproveSubmissionForDispatch
  | CancelSubmission
  | SupersedeSubmission;
