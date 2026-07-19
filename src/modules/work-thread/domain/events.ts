import type { ActorId, OrganisationId, ProjectId, WorkThreadId } from "@foundation/ids";
import type { DelegationCancelledReasonCode, StructuredUpdateType } from "./commands";

export interface WorkThreadCreated {
  readonly type: "WorkThreadCreated";
  readonly workThreadId: WorkThreadId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly expectedOutcome: string;
  readonly sourceReference: string;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface WorkAssigned {
  readonly type: "WorkAssigned";
  readonly sequence: number;
  readonly assigneeId: ActorId;
  readonly assignedBy: ActorId;
  readonly assignedAt: Date;
  readonly dueAt: Date;
  readonly reason: string;
}

export interface AssignmentAcknowledged {
  readonly type: "AssignmentAcknowledged";
  readonly sequence: number;
  readonly acknowledgedBy: ActorId;
  readonly acknowledgedAt: Date;
}

export interface WorkStarted {
  readonly type: "WorkStarted";
  readonly startedBy: ActorId;
  readonly startedAt: Date;
}

export interface StructuredUpdateRecorded {
  readonly type: "StructuredUpdateRecorded";
  readonly updateType: StructuredUpdateType;
  readonly note: string;
  readonly recordedBy: ActorId;
  readonly recordedAt: Date;
}

export interface BlockerRaised {
  readonly type: "BlockerRaised";
  readonly blockedOutcome: string;
  readonly reason: string;
  readonly requiredResolver: ActorId;
  readonly effect: string;
  readonly neededByAt: Date;
  readonly raisedBy: ActorId;
  readonly raisedAt: Date;
}

export interface BlockerResolved {
  readonly type: "BlockerResolved";
  readonly resolvedBy: ActorId;
  readonly resolvedAt: Date;
  readonly resolutionNote: string;
}

export interface DueDateChanged {
  readonly type: "DueDateChanged";
  readonly previousDueAt: Date;
  readonly newDueAt: Date;
  readonly approvedBy: ActorId;
  readonly reason: string;
  readonly changedAt: Date;
}

export interface OutcomeOffered {
  readonly type: "OutcomeOffered";
  readonly offeredBy: ActorId;
  readonly offeredAt: Date;
  readonly summary: string;
}

export interface OutcomeAccepted {
  readonly type: "OutcomeAccepted";
  readonly acceptedBy: ActorId;
  readonly acceptedAt: Date;
}

export interface ReworkRequested {
  readonly type: "ReworkRequested";
  readonly requestedBy: ActorId;
  readonly requestedAt: Date;
  readonly reason: string;
}

export interface WorkReopened {
  readonly type: "WorkReopened";
  readonly reopenedBy: ActorId;
  readonly reopenedAt: Date;
  readonly reason: string;
}

export interface WorkThreadCancelled {
  readonly type: "WorkThreadCancelled";
  readonly cancelledBy: ActorId;
  readonly cancelledAt: Date;
  readonly reason: string;
}

export interface RecallRequested {
  readonly type: "RecallRequested";
  readonly requestedBy: ActorId;
  readonly requestedAt: Date;
  readonly reason: string;
}

export interface RecallRetracted {
  readonly type: "RecallRetracted";
  readonly retractedBy: ActorId;
  readonly retractedAt: Date;
}

export interface RecallConfirmed {
  readonly type: "RecallConfirmed";
  readonly confirmedBy: ActorId;
  readonly confirmedAt: Date;
}

export interface RenegotiationRequested {
  readonly type: "RenegotiationRequested";
  readonly requestedBy: ActorId;
  readonly requestedAt: Date;
  readonly reason: string;
}

export interface TermsAdjusted {
  readonly type: "TermsAdjusted";
  readonly previousDueAt: Date;
  readonly newDueAt: Date;
  readonly adjustedBy: ActorId;
  readonly adjustedAt: Date;
  readonly note: string;
}

export interface DelegationCancelled {
  readonly type: "DelegationCancelled";
  readonly resolution: "reassign" | "release_to_pool" | "escalate";
  readonly reasonCode: DelegationCancelledReasonCode;
  readonly reasonDetail: string;
  readonly cancelledBy: ActorId;
  readonly cancelledAt: Date;
}

export interface ReleasedToOpenPool {
  readonly type: "ReleasedToOpenPool";
  readonly releasedAt: Date;
}

export interface EscalatedForReassignment {
  readonly type: "EscalatedForReassignment";
  readonly escalatedTo: ActorId;
  readonly escalatedAt: Date;
}

export type WorkThreadEvent =
  | WorkThreadCreated
  | WorkAssigned
  | AssignmentAcknowledged
  | WorkStarted
  | StructuredUpdateRecorded
  | BlockerRaised
  | BlockerResolved
  | DueDateChanged
  | OutcomeOffered
  | OutcomeAccepted
  | ReworkRequested
  | WorkReopened
  | WorkThreadCancelled
  | RecallRequested
  | RecallRetracted
  | RecallConfirmed
  | RenegotiationRequested
  | TermsAdjusted
  | DelegationCancelled
  | ReleasedToOpenPool
  | EscalatedForReassignment;
