import type { ClockPort } from "../ports/clock-port";
import type { IdPort } from "../ports/id-port";
import type { ActorId, CausationId, CorrelationId, OrganisationId, ProjectId } from "../ids/ids";
import type { DomainEventEnvelope } from "./event";

export interface BuildEventInput<TType extends string, TAggregateId, TPayload> {
  readonly eventType: TType;
  readonly aggregateId: TAggregateId;
  readonly aggregateVersion: number;
  readonly actorId: ActorId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId | null;
  readonly correlationId: CorrelationId;
  readonly causationId: CausationId;
  readonly payload: TPayload;
}

export function buildEvent<TType extends string, TAggregateId, TPayload>(
  input: BuildEventInput<TType, TAggregateId, TPayload>,
  deps: { readonly clock: ClockPort; readonly idPort: IdPort }
): DomainEventEnvelope<TType, TAggregateId, TPayload> {
  return {
    eventId: deps.idPort.newId(),
    eventType: input.eventType,
    aggregateId: input.aggregateId,
    aggregateVersion: input.aggregateVersion,
    actorId: input.actorId,
    organisationId: input.organisationId,
    projectId: input.projectId,
    correlationId: input.correlationId,
    causationId: input.causationId,
    occurredAt: deps.clock.now(),
    payload: input.payload
  };
}
