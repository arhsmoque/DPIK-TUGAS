import type {
  ActorId,
  DispatchAttemptId,
  OrganisationId,
  ProjectId,
  SubmissionId
} from "@foundation/ids";
import type { CustodianType } from "./dispatch";

export interface CreateDispatchAttempt {
  readonly type: "CreateDispatchAttempt";
  readonly dispatchAttemptId: DispatchAttemptId;
  readonly submissionId: SubmissionId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly destination: string;
  readonly recipientContact: string;
  readonly packageSummary: string;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface CreateReplacementDispatchAttempt {
  readonly type: "CreateReplacementDispatchAttempt";
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

export interface AssignDispatch {
  readonly type: "AssignDispatch";
  readonly custodianType: CustodianType;
  readonly custodianActorId: ActorId | null;
  readonly custodianName: string;
  readonly assignedBy: ActorId;
  readonly assignedAt: Date;
}

export interface ConfirmPackageCollection {
  readonly type: "ConfirmPackageCollection";
  readonly confirmedBy: ActorId;
  readonly confirmedAt: Date;
}

export interface ReportPackageDelivery {
  readonly type: "ReportPackageDelivery";
  readonly reportedBy: ActorId;
  readonly reportedAt: Date;
  readonly deliveredTo: string;
}

export interface ReportDeliveryFailure {
  readonly type: "ReportDeliveryFailure";
  readonly reportedBy: ActorId;
  readonly reportedAt: Date;
  readonly reason: string;
}

export interface CancelDispatchAttempt {
  readonly type: "CancelDispatchAttempt";
  readonly cancelledBy: ActorId;
  readonly cancelledAt: Date;
  readonly reason: string;
}

export type DispatchCommand =
  | CreateDispatchAttempt
  | CreateReplacementDispatchAttempt
  | AssignDispatch
  | ConfirmPackageCollection
  | ReportPackageDelivery
  | ReportDeliveryFailure
  | CancelDispatchAttempt;
