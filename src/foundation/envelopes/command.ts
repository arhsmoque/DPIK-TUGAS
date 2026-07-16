import type {
  ActorId,
  CausationId,
  CommandId,
  CorrelationId,
  IdempotencyKey,
  OrganisationId,
  ProjectId
} from "../ids/ids";

/**
 * TAggregateId is generic per call site (WorkThreadId, DeliverableId, ...) so
 * a command envelope can never be constructed against the wrong aggregate
 * type -- catching that is TypeScript's job, not a runtime check.
 */
export interface CommandEnvelope<TType extends string, TAggregateId, TPayload> {
  readonly commandId: CommandId;
  readonly commandType: TType;
  readonly actorId: ActorId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId | null;
  readonly aggregateId: TAggregateId;
  /** null means "this command creates a new aggregate" -- there is no prior version to expect. */
  readonly expectedVersion: number | null;
  readonly idempotencyKey: IdempotencyKey;
  readonly correlationId: CorrelationId;
  /** null only for the command that originates a new correlation chain. */
  readonly causationId: CausationId | null;
  readonly issuedAt: Date;
  readonly payload: TPayload;
}
