import type {
  ActorId,
  DeliverableId,
  DeliverableRevisionId,
  OrganisationId,
  ProjectId,
  SubmissionId
} from "@foundation/ids";
import type { RecipientType } from "./submission";

export interface SubmissionCreated {
  readonly type: "SubmissionCreated";
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

export interface SubmissionManifestItemAdded {
  readonly type: "SubmissionManifestItemAdded";
  readonly deliverableId: DeliverableId;
  readonly revisionId: DeliverableRevisionId;
  readonly label: string;
  readonly repositoryReference: string;
  readonly addedBy: ActorId;
  readonly addedAt: Date;
}

export interface SubmissionPrepared {
  readonly type: "SubmissionPrepared";
  readonly preparedBy: ActorId;
  readonly preparedAt: Date;
}

export interface SubmissionReturnedToDraft {
  readonly type: "SubmissionReturnedToDraft";
  readonly returnedBy: ActorId;
  readonly returnedAt: Date;
  readonly reason: string;
}

export interface SubmissionApprovedForDispatch {
  readonly type: "SubmissionApprovedForDispatch";
  readonly approvedBy: ActorId;
  readonly approvedAt: Date;
  readonly credentialReference: string;
}

export interface SubmissionCancelled {
  readonly type: "SubmissionCancelled";
  readonly cancelledBy: ActorId;
  readonly cancelledAt: Date;
  readonly reason: string;
}

export interface SubmissionSuperseded {
  readonly type: "SubmissionSuperseded";
  readonly supersededBy: ActorId;
  readonly supersededAt: Date;
  readonly reason: string;
  readonly replacementSubmissionId: SubmissionId;
}

export type SubmissionEvent =
  | SubmissionCreated
  | SubmissionManifestItemAdded
  | SubmissionPrepared
  | SubmissionReturnedToDraft
  | SubmissionApprovedForDispatch
  | SubmissionCancelled
  | SubmissionSuperseded;
