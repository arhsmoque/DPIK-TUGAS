import type { ClockPort } from "../ports/clock-port";
import type { IdPort } from "../ports/id-port";
import { hashPayload } from "../hashing/canonical-hash";
import type {
  ActorId,
  CausationId,
  CorrelationId,
  IdempotencyKey,
  OrganisationId,
  ProjectId
} from "../ids/ids";
import type { CommandEnvelope } from "./command";

export interface BuildCommandInput<TType extends string, TAggregateId, TPayload> {
  readonly commandType: TType;
  readonly actorId: ActorId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId | null;
  readonly aggregateId: TAggregateId;
  readonly expectedVersion: number | null;
  readonly payload: TPayload;
  readonly correlationId: CorrelationId;
  readonly causationId: CausationId | null;
  /**
   * Caller-supplied idempotency key, when the command has a natural business
   * key (e.g. "one AssignWork per Work Thread per acknowledgement window").
   * Omit to derive one from the canonical hash of type + aggregate + payload
   * -- the default is safe but only dedupes exact-payload repeats, not
   * business-meaning repeats with a different payload shape.
   */
  readonly idempotencyKey?: IdempotencyKey;
}

export async function buildCommand<TType extends string, TAggregateId, TPayload>(
  input: BuildCommandInput<TType, TAggregateId, TPayload>,
  deps: { readonly clock: ClockPort; readonly idPort: IdPort }
): Promise<CommandEnvelope<TType, TAggregateId, TPayload>> {
  const idempotencyKey =
    input.idempotencyKey ??
    ((await hashPayload({
      commandType: input.commandType,
      aggregateId: input.aggregateId,
      payload: input.payload
    })) as unknown as IdempotencyKey);

  return {
    commandId: deps.idPort.newId(),
    commandType: input.commandType,
    actorId: input.actorId,
    organisationId: input.organisationId,
    projectId: input.projectId,
    aggregateId: input.aggregateId,
    expectedVersion: input.expectedVersion,
    idempotencyKey,
    correlationId: input.correlationId,
    causationId: input.causationId,
    issuedAt: deps.clock.now(),
    payload: input.payload
  };
}
