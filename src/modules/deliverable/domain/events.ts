import type {
  ActorId,
  DeliverableId,
  DeliverableRevisionId,
  OrganisationId,
  ProjectId,
  WorkThreadId
} from "@foundation/ids";

export interface DeliverableCreated {
  readonly type: "DeliverableCreated";
  readonly deliverableId: DeliverableId;
  readonly workThreadId: WorkThreadId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface RevisionSubmitted {
  readonly type: "RevisionSubmitted";
  readonly revisionId: DeliverableRevisionId;
  readonly sequence: number;
  readonly label: string;
  readonly repositoryReference: string;
  readonly changeSummary: string;
  readonly fingerprint: string | null;
  readonly preparedBy: ActorId;
  readonly preparedAt: Date;
}

export interface RevisionApproved {
  readonly type: "RevisionApproved";
  readonly revisionId: DeliverableRevisionId;
  readonly decidedBy: ActorId;
  readonly decidedAt: Date;
  readonly comments: string;
  readonly selfApproved: boolean;
}

export interface RevisionRequired {
  readonly type: "RevisionRequired";
  readonly revisionId: DeliverableRevisionId;
  readonly decidedBy: ActorId;
  readonly decidedAt: Date;
  readonly comments: string;
}

export interface RevisionRejected {
  readonly type: "RevisionRejected";
  readonly revisionId: DeliverableRevisionId;
  readonly decidedBy: ActorId;
  readonly decidedAt: Date;
  readonly comments: string;
}

export interface DeliverableWithdrawn {
  readonly type: "DeliverableWithdrawn";
  readonly withdrawnBy: ActorId;
  readonly withdrawnAt: Date;
  readonly reason: string;
}

export type DeliverableEvent =
  | DeliverableCreated
  | RevisionSubmitted
  | RevisionApproved
  | RevisionRequired
  | RevisionRejected
  | DeliverableWithdrawn;
