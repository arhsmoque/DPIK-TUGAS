import type {
  ActorId,
  CausationId,
  CorrelationId,
  DomainEventId,
  OrganisationId,
  ProjectId
} from "../ids/ids";

export interface DomainEventEnvelope<TType extends string, TAggregateId, TPayload> {
  readonly eventId: DomainEventId;
  readonly eventType: TType;
  readonly aggregateId: TAggregateId;
  /** Aggregate version after this event is applied -- append-only, never reused. */
  readonly aggregateVersion: number;
  readonly actorId: ActorId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId | null;
  readonly correlationId: CorrelationId;
  /** Every event has a cause -- unlike a command, an event is never the origin. */
  readonly causationId: CausationId;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}
