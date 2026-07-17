import type { ActorId, OrganisationId, ProjectId, WorkThreadId } from "@foundation/ids";

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

export type WorkThreadEvent = WorkThreadCreated | WorkAssigned | AssignmentAcknowledged;
