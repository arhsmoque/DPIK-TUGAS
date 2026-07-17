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

export type WorkThreadState =
  | (WorkThreadFacts & {
      readonly lifecycle: "Unassigned";
      readonly currentAssignment: null;
    })
  | (WorkThreadFacts & {
      readonly lifecycle: "AwaitingAcknowledgement";
      readonly currentAssignment: Assignment & { readonly acknowledgedAt: null };
    })
  | (WorkThreadFacts & {
      readonly lifecycle: "Assigned" | "InProgress" | "AwaitingAcceptance" | "Closed";
      readonly currentAssignment: Assignment & { readonly acknowledgedAt: Date };
    })
  | (WorkThreadFacts & {
      readonly lifecycle: "Cancelled";
      readonly currentAssignment: Assignment | null;
    });
