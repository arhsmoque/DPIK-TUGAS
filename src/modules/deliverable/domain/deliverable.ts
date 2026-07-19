import type {
  ActorId,
  DeliverableId,
  DeliverableRevisionId,
  OrganisationId,
  ProjectId,
  WorkThreadId
} from "@foundation/ids";

export interface DeliverableRevision {
  readonly revisionId: DeliverableRevisionId;
  readonly sequence: number;
  readonly label: string;
  readonly repositoryReference: string;
  readonly changeSummary: string;
  readonly preparedBy: ActorId;
  readonly preparedAt: Date;
  readonly fingerprint: string | null;
  // Set once a later revision supersedes this one. Earlier revisions are
  // never overwritten (BOM-REVIEW-002) -- this is the only mutation allowed
  // on a past revision, and it never changes the revision's own facts.
  readonly supersededBy: DeliverableRevisionId | null;
}

export interface ReviewDecision {
  readonly revisionId: DeliverableRevisionId;
  readonly decidedBy: ActorId;
  readonly decidedAt: Date;
  readonly comments: string;
  readonly selfApproved: boolean;
}

export type DeliverableStatus =
  "Draft" | "InReview" | "RevisionRequired" | "Approved" | "Rejected" | "Withdrawn";

export interface DeliverableFacts {
  readonly deliverableId: DeliverableId;
  readonly workThreadId: WorkThreadId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface DeliverableState {
  readonly facts: DeliverableFacts;
  readonly status: DeliverableStatus;
  // Append-only; never mutated except to stamp supersededBy on the prior head.
  readonly revisions: readonly DeliverableRevision[];
  readonly currentRevisionId: DeliverableRevisionId | null;
  readonly lastReview: ReviewDecision | null;
}
