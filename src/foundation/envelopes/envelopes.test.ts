import { describe, expect, it } from "vitest";
import { FixedClock } from "../ports/clock-port";
import { SequentialIdPort } from "../ports/id-port";
import { buildCommand } from "./build-command";
import { buildEvent } from "./build-event";
import { causationFromCommand, newCorrelationId } from "./correlation";
import type { ActorId, OrganisationId, ProjectId, WorkThreadId } from "../ids/ids";

const clock = () => new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
const actorId = "actor-1" as ActorId;
const organisationId = "org-1" as OrganisationId;
const projectId = "project-1" as ProjectId;
const workThreadId = "wt-1" as WorkThreadId;

describe("buildCommand", () => {
  it("assembles a fully-populated envelope with generated id, time and idempotency key", async () => {
    const idPort = new SequentialIdPort();
    const correlationId = newCorrelationId(idPort);

    const command = await buildCommand(
      {
        commandType: "AssignWork" as const,
        actorId,
        organisationId,
        projectId,
        aggregateId: workThreadId,
        expectedVersion: 3,
        payload: { assigneeId: "user-2" },
        correlationId,
        causationId: null
      },
      { clock: clock(), idPort }
    );

    expect(command.commandId).toBe("test-id-2");
    expect(command.correlationId).toBe(correlationId);
    expect(command.issuedAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(command.idempotencyKey).toMatch(/^[0-9a-f]{64}$/);
    expect(command.expectedVersion).toBe(3);
    expect(command.causationId).toBeNull();
  });

  it("derives the same idempotency key for the same commandType + aggregate + payload", async () => {
    const idPort = new SequentialIdPort();
    const correlationId = newCorrelationId(idPort);
    const base = {
      commandType: "AssignWork" as const,
      actorId,
      organisationId,
      projectId,
      aggregateId: workThreadId,
      expectedVersion: 3,
      payload: { assigneeId: "user-2" },
      correlationId,
      causationId: null
    };

    const first = await buildCommand(base, { clock: clock(), idPort });
    const second = await buildCommand(base, { clock: clock(), idPort });

    expect(first.idempotencyKey).toBe(second.idempotencyKey);
    expect(first.commandId).not.toBe(second.commandId);
  });

  it("respects a caller-supplied idempotency key instead of deriving one", async () => {
    const idPort = new SequentialIdPort();
    const correlationId = newCorrelationId(idPort);

    const command = await buildCommand(
      {
        commandType: "AssignWork" as const,
        actorId,
        organisationId,
        projectId,
        aggregateId: workThreadId,
        expectedVersion: null,
        payload: { assigneeId: "user-2" },
        correlationId,
        causationId: null,
        idempotencyKey: "business-key-1" as never
      },
      { clock: clock(), idPort }
    );

    expect(command.idempotencyKey).toBe("business-key-1");
  });
});

describe("buildEvent", () => {
  it("threads causation from the command that produced it", async () => {
    const idPort = new SequentialIdPort();
    const correlationId = newCorrelationId(idPort);

    const command = await buildCommand(
      {
        commandType: "AssignWork" as const,
        actorId,
        organisationId,
        projectId,
        aggregateId: workThreadId,
        expectedVersion: 3,
        payload: { assigneeId: "user-2" },
        correlationId,
        causationId: null
      },
      { clock: clock(), idPort }
    );

    const event = buildEvent(
      {
        eventType: "WorkAssigned" as const,
        aggregateId: workThreadId,
        aggregateVersion: 4,
        actorId,
        organisationId,
        projectId,
        correlationId: command.correlationId,
        causationId: causationFromCommand(command.commandId),
        payload: { assigneeId: "user-2" }
      },
      { clock: clock(), idPort }
    );

    expect(event.causationId).toBe(command.commandId);
    expect(event.correlationId).toBe(command.correlationId);
    expect(event.aggregateVersion).toBe(4);
  });
});
