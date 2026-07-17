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

export type WorkThreadCommand = CreateWorkThread | AssignWork | AcknowledgeAssignment;
