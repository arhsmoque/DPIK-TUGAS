import type {
  ActorId,
  DispatchAttemptId,
  OrganisationId,
  ProjectId,
  SubmissionId
} from "@foundation/ids";
import type { CustodianType } from "./dispatch";

export interface DispatchAttemptCreated {
  readonly type: "DispatchAttemptCreated";
  readonly dispatchAttemptId: DispatchAttemptId;
  readonly submissionId: SubmissionId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly destination: string;
  readonly recipientContact: string;
  readonly packageSummary: string;
  readonly replacesDispatchAttemptId: DispatchAttemptId | null;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface ReplacementDispatchCreated {
  readonly type: "ReplacementDispatchCreated";
  readonly dispatchAttemptId: DispatchAttemptId;
  readonly submissionId: SubmissionId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly destination: string;
  readonly recipientContact: string;
  readonly packageSummary: string;
  readonly replacesDispatchAttemptId: DispatchAttemptId;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface DispatchAssigned {
  readonly type: "DispatchAssigned";
  readonly custodianType: CustodianType;
  readonly custodianActorId: ActorId | null;
  readonly custodianName: string;
  readonly assignedBy: ActorId;
  readonly assignedAt: Date;
}

export interface PackageCollected {
  readonly type: "PackageCollected";
  readonly confirmedBy: ActorId;
  readonly confirmedAt: Date;
}

export interface PackageDelivered {
  readonly type: "PackageDelivered";
  readonly reportedBy: ActorId;
  readonly reportedAt: Date;
  readonly deliveredTo: string;
}

export interface DeliveryFailed {
  readonly type: "DeliveryFailed";
  readonly reportedBy: ActorId;
  readonly reportedAt: Date;
  readonly reason: string;
}

export interface DispatchCancelled {
  readonly type: "DispatchCancelled";
  readonly cancelledBy: ActorId;
  readonly cancelledAt: Date;
  readonly reason: string;
}

export type DispatchEvent =
  | DispatchAttemptCreated
  | ReplacementDispatchCreated
  | DispatchAssigned
  | PackageCollected
  | PackageDelivered
  | DeliveryFailed
  | DispatchCancelled;
