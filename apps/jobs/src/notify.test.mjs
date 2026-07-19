import { describe, expect, it } from "vitest";
import { resolveRecipientId, renderNotification } from "./notify.mjs";

describe("resolveRecipientId", () => {
  it("uses the direct payload field for work-thread.assigned.v1", () => {
    const recipient = resolveRecipientId(
      { topic: "work-thread.assigned.v1", payload: { assigneeId: "actor-2" }, actorId: "actor-1" },
      null
    );
    expect(recipient).toBe("actor-2");
  });

  it("uses requiredResolver for a raised blocker", () => {
    const recipient = resolveRecipientId(
      {
        topic: "work-thread.blocker-raised.v1",
        payload: { requiredResolver: "actor-owner" },
        actorId: "actor-assignee"
      },
      null
    );
    expect(recipient).toBe("actor-owner");
  });

  it("falls back to whichever of assignee/owner did not act", () => {
    const notifiesOwner = resolveRecipientId(
      { topic: "work-thread.started.v1", payload: {}, actorId: "assignee-1" },
      { currentAssigneeId: "assignee-1", assignedBy: "owner-1" }
    );
    expect(notifiesOwner).toBe("owner-1");

    const notifiesAssignee = resolveRecipientId(
      { topic: "work-thread.due-date-changed.v1", payload: {}, actorId: "owner-1" },
      { currentAssigneeId: "assignee-1", assignedBy: "owner-1" }
    );
    expect(notifiesAssignee).toBe("assignee-1");
  });

  it("skips topics with no well-defined single recipient", () => {
    expect(
      resolveRecipientId(
        { topic: "work-thread.released-to-open-pool.v1", payload: {}, actorId: "owner-1" },
        { currentAssigneeId: null, assignedBy: "owner-1" }
      )
    ).toBeNull();
  });

  it("returns null when there is no context and no direct field", () => {
    expect(
      resolveRecipientId(
        { topic: "work-thread.started.v1", payload: {}, actorId: "assignee-1" },
        null
      )
    ).toBeNull();
  });
});

describe("renderNotification", () => {
  it("builds a work-thread deep link and a known subject", () => {
    const rendered = renderNotification(
      { topic: "work-thread.assigned.v1", aggregateId: "wt-1", aggregateType: "WorkThread" },
      "http://127.0.0.1:4173/"
    );
    expect(rendered.subject).toBe("TUGAS — New assignment");
    expect(rendered.text).toContain("http://127.0.0.1:4173/work-threads/wt-1");
  });

  it("builds a deliverable deep link", () => {
    const rendered = renderNotification(
      {
        topic: "deliverable.revision-submitted.v1",
        aggregateId: "dl-1",
        aggregateType: "Deliverable"
      },
      "http://127.0.0.1:4173"
    );
    expect(rendered.text).toContain("http://127.0.0.1:4173/deliverables/dl-1");
  });

  it("falls back to the raw topic for an unmapped topic", () => {
    const rendered = renderNotification(
      {
        topic: "work-thread.some-future-topic.v1",
        aggregateId: "wt-2",
        aggregateType: "WorkThread"
      },
      "http://127.0.0.1:4173"
    );
    expect(rendered.subject).toBe("TUGAS — work-thread.some-future-topic.v1");
  });
});
