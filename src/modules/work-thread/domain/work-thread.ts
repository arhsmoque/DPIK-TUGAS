import type { ActorId, OrganisationId, ProjectId, WorkThreadId } from "@foundation/ids";

export interface WorkThreadFacts {
  readonly workThreadId: WorkThreadId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly expectedOutcome: string;
  readonly sourceReference: string;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface Assignment {
  readonly sequence: number;
  readonly assigneeId: ActorId;
  readonly assignedBy: ActorId;
  readonly assignedAt: Date;
  readonly dueAt: Date;
  readonly reason: string;
  readonly acknowledgedAt: Date | null;
}

// Blocked, a pending Recall and a pending Renegotiation are orthogonal to
// lifecycle (03_DOMAIN_AND_STATE_MODEL.md "State doctrine"): work can be
// InProgress and Blocked at once, or Assigned with a Renegotiation pending.
// They are tracked as separate nullable facts rather than folded into the
// lifecycle discriminant.
export interface BlockerDetail {
  readonly blockedOutcome: string;
  readonly reason: string;
  readonly requiredResolver: ActorId;
  readonly effect: string;
  readonly neededByAt: Date;
  readonly raisedBy: ActorId;
  readonly raisedAt: Date;
}

export interface RecallDetail {
  readonly requestedBy: ActorId;
  readonly requestedAt: Date;
  readonly reason: string;
}

export interface RenegotiationDetail {
  readonly requestedBy: ActorId;
  readonly requestedAt: Date;
  readonly reason: string;
}

interface OrthogonalFacts {
  readonly blocker: BlockerDetail | null;
  readonly pendingRecall: RecallDetail | null;
  readonly pendingRenegotiation: RenegotiationDetail | null;
}

export type WorkThreadState =
  | (WorkThreadFacts &
      OrthogonalFacts & {
        readonly lifecycle: "Unassigned";
        readonly currentAssignment: null;
      })
  | (WorkThreadFacts &
      OrthogonalFacts & {
        readonly lifecycle: "AwaitingAcknowledgement";
        readonly currentAssignment: Assignment & { readonly acknowledgedAt: null };
      })
  | (WorkThreadFacts &
      OrthogonalFacts & {
        readonly lifecycle: "Assigned" | "InProgress" | "AwaitingAcceptance";
        readonly currentAssignment: Assignment & { readonly acknowledgedAt: Date };
      })
  | (WorkThreadFacts &
      OrthogonalFacts & {
        readonly lifecycle: "Closed";
        readonly currentAssignment: Assignment & { readonly acknowledgedAt: Date };
      })
  | (WorkThreadFacts &
      OrthogonalFacts & {
        readonly lifecycle: "Cancelled";
        readonly currentAssignment: Assignment | null;
      });

export type WorkThreadLifecycle = WorkThreadState["lifecycle"];
