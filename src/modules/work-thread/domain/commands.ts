import type { ActorId, OrganisationId, ProjectId, WorkThreadId } from "@foundation/ids";

export interface CreateWorkThread {
  readonly type: "CreateWorkThread";
  readonly workThreadId: WorkThreadId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly expectedOutcome: string;
  readonly sourceReference: string;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface AssignWork {
  readonly type: "AssignWork";
  readonly assigneeId: ActorId;
  readonly assignedBy: ActorId;
  readonly assignedAt: Date;
  readonly dueAt: Date;
  readonly reason: string;
}

export interface AcknowledgeAssignment {
  readonly type: "AcknowledgeAssignment";
  readonly acknowledgedBy: ActorId;
  readonly acknowledgedAt: Date;
}

export interface StartWork {
  readonly type: "StartWork";
  readonly startedBy: ActorId;
  readonly startedAt: Date;
}

export type StructuredUpdateType =
  "Progress" | "Question" | "Clarification" | "Decision" | "CommitmentNote";

export interface RecordStructuredUpdate {
  readonly type: "RecordStructuredUpdate";
  readonly updateType: StructuredUpdateType;
  readonly note: string;
  readonly recordedBy: ActorId;
  readonly recordedAt: Date;
}

export interface RaiseBlocker {
  readonly type: "RaiseBlocker";
  readonly blockedOutcome: string;
  readonly reason: string;
  readonly requiredResolver: ActorId;
  readonly effect: string;
  readonly neededByAt: Date;
  readonly raisedBy: ActorId;
  readonly raisedAt: Date;
}

export interface ResolveBlocker {
  readonly type: "ResolveBlocker";
  readonly resolvedBy: ActorId;
  readonly resolvedAt: Date;
  readonly resolutionNote: string;
}

export interface ChangeDueDate {
  readonly type: "ChangeDueDate";
  readonly newDueAt: Date;
  readonly approvedBy: ActorId;
  readonly reason: string;
  readonly changedAt: Date;
}

export interface OfferOutcome {
  readonly type: "OfferOutcome";
  readonly offeredBy: ActorId;
  readonly offeredAt: Date;
  readonly summary: string;
}

export interface AcceptOutcome {
  readonly type: "AcceptOutcome";
  readonly acceptedBy: ActorId;
  readonly acceptedAt: Date;
}

export interface RequestRework {
  readonly type: "RequestRework";
  readonly requestedBy: ActorId;
  readonly requestedAt: Date;
  readonly reason: string;
}

export interface ReopenWork {
  readonly type: "ReopenWork";
  readonly reopenedBy: ActorId;
  readonly reopenedAt: Date;
  readonly reason: string;
}

export interface CancelWorkThread {
  readonly type: "CancelWorkThread";
  readonly cancelledBy: ActorId;
  readonly cancelledAt: Date;
  readonly reason: string;
}

export interface RequestRecall {
  readonly type: "RequestRecall";
  readonly requestedBy: ActorId;
  readonly requestedAt: Date;
  readonly reason: string;
}

export interface RetractRecall {
  readonly type: "RetractRecall";
  readonly retractedBy: ActorId;
  readonly retractedAt: Date;
}

export interface ConfirmRecall {
  readonly type: "ConfirmRecall";
  readonly confirmedBy: ActorId;
  readonly confirmedAt: Date;
  readonly newAssigneeId: ActorId;
  readonly newDueAt: Date;
  readonly reason: string;
}

export interface RequestRenegotiation {
  readonly type: "RequestRenegotiation";
  readonly requestedBy: ActorId;
  readonly requestedAt: Date;
  readonly reason: string;
}

export interface AdjustTerms {
  readonly type: "AdjustTerms";
  readonly adjustedBy: ActorId;
  readonly adjustedAt: Date;
  readonly newDueAt: Date;
  readonly note: string;
}

export type DelegationCancelledReasonCode = "overload" | "emergency" | "scope_mismatch" | "other";

export interface CancelDelegationReassign {
  readonly type: "CancelDelegation";
  readonly resolution: "reassign";
  readonly newAssigneeId: ActorId;
  readonly newDueAt: Date;
  readonly reasonCode: DelegationCancelledReasonCode;
  readonly reasonDetail: string;
  readonly cancelledBy: ActorId;
  readonly cancelledAt: Date;
}

export interface CancelDelegationReleaseToPool {
  readonly type: "CancelDelegation";
  readonly resolution: "release_to_pool";
  readonly reasonCode: DelegationCancelledReasonCode;
  readonly reasonDetail: string;
  readonly cancelledBy: ActorId;
  readonly cancelledAt: Date;
}

export interface CancelDelegationEscalate {
  readonly type: "CancelDelegation";
  readonly resolution: "escalate";
  readonly escalateTo: ActorId;
  readonly reasonCode: DelegationCancelledReasonCode;
  readonly reasonDetail: string;
  readonly cancelledBy: ActorId;
  readonly cancelledAt: Date;
}

export type CancelDelegation =
  CancelDelegationReassign | CancelDelegationReleaseToPool | CancelDelegationEscalate;

export interface ClaimWork {
  readonly type: "ClaimWork";
  readonly claimedBy: ActorId;
  readonly claimedAt: Date;
  readonly dueAt: Date;
  readonly reason: string;
}

export type WorkThreadCommand =
  | CreateWorkThread
  | AssignWork
  | AcknowledgeAssignment
  | StartWork
  | RecordStructuredUpdate
  | RaiseBlocker
  | ResolveBlocker
  | ChangeDueDate
  | OfferOutcome
  | AcceptOutcome
  | RequestRework
  | ReopenWork
  | CancelWorkThread
  | RequestRecall
  | RetractRecall
  | ConfirmRecall
  | RequestRenegotiation
  | AdjustTerms
  | CancelDelegation
  | ClaimWork;
