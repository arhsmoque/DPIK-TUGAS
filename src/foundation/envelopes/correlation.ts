import type { IdPort } from "../ports/id-port";
import type { CausationId, CommandId, CorrelationId, DomainEventId } from "../ids/ids";

/** Call once at the start of a new chain of causally-related commands/events. */
export function newCorrelationId(idPort: IdPort): CorrelationId {
  return idPort.newId<"CorrelationId">();
}

export function causationFromCommand(commandId: CommandId): CausationId {
  return commandId as unknown as CausationId;
}

export function causationFromEvent(eventId: DomainEventId): CausationId {
  return eventId as unknown as CausationId;
}
