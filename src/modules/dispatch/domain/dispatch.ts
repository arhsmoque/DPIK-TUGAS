import type {
  ActorId,
  DispatchAttemptId,
  OrganisationId,
  ProjectId,
  SubmissionId
} from "@foundation/ids";

export type CustodianType = "internal" | "external";

export interface Custodian {
  readonly custodianType: CustodianType;
  // Set only for an internal DPIK staff member acting as informal courier
  // (BOM 5.7 / 10.2) -- recorded for reimbursement, grants no broader access.
  readonly custodianActorId: ActorId | null;
  readonly custodianName: string;
}

export interface DispatchFacts {
  readonly dispatchAttemptId: DispatchAttemptId;
  readonly submissionId: SubmissionId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly destination: string;
  readonly recipientContact: string;
  readonly packageSummary: string;
  // Set only when this attempt exists because an earlier one failed
  // (BOM-DISP-002: the failed attempt remains in history, never overwritten).
  readonly replacesDispatchAttemptId: DispatchAttemptId | null;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export type DispatchStatus =
  "Prepared" | "Assigned" | "InTransit" | "Delivered" | "Failed" | "Cancelled";

export interface DispatchState {
  readonly facts: DispatchFacts;
  readonly status: DispatchStatus;
  readonly custodian: Custodian | null;
  readonly deliveredTo: string | null;
  readonly failureReason: string | null;
}
