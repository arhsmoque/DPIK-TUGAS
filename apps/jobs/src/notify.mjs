// Pure logic for the outbox publisher: given an outbox message and enough
// context from the database, decide who to notify and what to say. No I/O
// here -- outbox-publisher.mjs owns the database and network calls so this
// file can be unit tested with plain fixtures.

const DIRECT_RECIPIENT_FIELDS = {
  "work-thread.assigned.v1": "assigneeId",
  "work-thread.blocker-raised.v1": "requiredResolver",
  "work-thread.escalated-for-reassignment.v1": "escalatedTo"
};

// Topics with no single well-defined recipient yet (e.g. "released to an
// open pool" has no one recipient -- it needs a fan-out to eligible project
// members, which is a V2 concern). Skipping these is a deliberate, logged
// no-op rather than a silent drop.
const SKIPPED_TOPICS = new Set([
  "work-thread.created.v1",
  "work-thread.recall-confirmed.v1",
  "work-thread.delegation-cancelled.v1",
  "work-thread.released-to-open-pool.v1",
  "deliverable.created.v1",
  "deliverable.withdrawn.v1"
]);

/**
 * @param {{ topic: string, payload: Record<string, unknown>, actorId: string }} message
 * @param {{ currentAssigneeId: string | null, assignedBy: string | null } | null} workThreadRow
 * @returns {string | null}
 */
export function resolveRecipientId(message, workThreadRow) {
  const { topic, payload, actorId } = message;

  if (SKIPPED_TOPICS.has(topic)) return null;

  const directField = DIRECT_RECIPIENT_FIELDS[topic];
  if (directField && typeof payload[directField] === "string") {
    return payload[directField];
  }

  if (topic.startsWith("work-thread.") || topic.startsWith("deliverable.")) {
    if (workThreadRow === null) return null;
    const candidates = [workThreadRow.currentAssigneeId, workThreadRow.assignedBy].filter(
      (id) => typeof id === "string" && id !== actorId
    );
    return candidates[0] ?? null;
  }

  return null;
}

const TOPIC_LABELS = {
  "work-thread.assigned.v1": "New assignment",
  "work-thread.started.v1": "Work started",
  "work-thread.structured-update-recorded.v1": "New update",
  "work-thread.blocker-raised.v1": "Blocker raised — action needed",
  "work-thread.blocker-resolved.v1": "Blocker resolved",
  "work-thread.due-date-changed.v1": "Due date changed",
  "work-thread.outcome-offered.v1": "Outcome offered for acceptance",
  "work-thread.outcome-accepted.v1": "Work accepted and closed",
  "work-thread.rework-requested.v1": "Rework requested",
  "work-thread.reopened.v1": "Work reopened",
  "work-thread.cancelled.v1": "Work cancelled",
  "work-thread.recall-requested.v1": "Recall requested",
  "work-thread.recall-retracted.v1": "Recall retracted",
  "work-thread.renegotiation-requested.v1": "Renegotiation requested",
  "work-thread.terms-adjusted.v1": "Terms adjusted",
  "work-thread.escalated-for-reassignment.v1": "Escalated to you for reassignment",
  "deliverable.revision-submitted.v1": "New deliverable revision submitted",
  "deliverable.revision-reviewed.v1": "Deliverable revision reviewed"
};

/**
 * @param {{ topic: string, aggregateId: string, aggregateType: string }} message
 * @param {string} appBaseUrl
 * @returns {{ subject: string, text: string }}
 */
export function renderNotification(message, appBaseUrl) {
  const label = TOPIC_LABELS[message.topic] ?? message.topic;
  const path = message.aggregateType === "Deliverable" ? "deliverables" : "work-threads";
  const link = `${appBaseUrl.replace(/\/$/, "")}/${path}/${message.aggregateId}`;
  return {
    subject: `TUGAS — ${label}`,
    text:
      `${label}.\n\n` +
      `Open the record in TUGAS for the full detail and to take action: ${link}\n\n` +
      "This is an automated notification. Replying to this email does not update TUGAS."
  };
}
