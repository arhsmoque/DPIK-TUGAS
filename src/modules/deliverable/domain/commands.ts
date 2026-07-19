import type {
  ActorId,
  DeliverableId,
  DeliverableRevisionId,
  OrganisationId,
  ProjectId,
  WorkThreadId
} from "@foundation/ids";

export interface CreateDeliverable {
  readonly type: "CreateDeliverable";
  readonly deliverableId: DeliverableId;
  readonly workThreadId: WorkThreadId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface SubmitRevision {
  readonly type: "SubmitRevision";
  readonly revisionId: DeliverableRevisionId;
  readonly label: string;
  readonly repositoryReference: string;
  readonly changeSummary: string;
  readonly fingerprint: string | null;
  readonly preparedBy: ActorId;
  readonly preparedAt: Date;
}

export type ReviewOutcome = "approved" | "revision_required" | "rejected";

export interface ReviewRevision {
  readonly type: "ReviewRevision";
  readonly outcome: ReviewOutcome;
  readonly comments: string;
  readonly decidedBy: ActorId;
  readonly decidedAt: Date;
  // True only when the preparer and reviewer are the same identity and no
  // other suitable reviewer exists (BOM 4.9 / role matrix separation-of-duty
  // exception #1). The command must say so explicitly; the domain will not
  // infer it silently.
  readonly selfApproved: boolean;
}

export interface WithdrawDeliverable {
  readonly type: "WithdrawDeliverable";
  readonly withdrawnBy: ActorId;
  readonly withdrawnAt: Date;
  readonly reason: string;
}

export type DeliverableCommand =
  CreateDeliverable | SubmitRevision | ReviewRevision | WithdrawDeliverable;
