#!/usr/bin/env node
// Publishes queued public.outbox_messages as staff notifications (the
// "notify + deep link" transport model). This is the piece gaps-findings.md
// already flagged as missing ("No publisher, retry schedule, dead-letter
// behavior... exists") -- it exists now, but has not been run against the
// shared Supabase project. Uses the service-role key deliberately: this is
// a trusted server-side job, never browser code, which is exactly the case
// AGENTS.md carves out for that credential.
//
// Usage:
//   node apps/jobs/src/outbox-publisher.mjs            # single pass, exit
//   node apps/jobs/src/outbox-publisher.mjs --watch     # poll forever
//   node apps/jobs/src/outbox-publisher.mjs --watch --interval-ms 30000
import { createClient } from "@supabase/supabase-js";
import { resolveRecipientId, renderNotification } from "./notify.mjs";
import { selectNotifier } from "./notifiers.mjs";

const MAX_ATTEMPTS = 5;
const DEFAULT_BATCH_SIZE = 25;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required (see apps/jobs/README.md)`);
  }
  return value;
}

function parseArgs(argv) {
  const args = { watch: false, intervalMs: 60_000 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--watch") args.watch = true;
    else if (argv[i] === "--interval-ms") args.intervalMs = Number(argv[++i]);
  }
  return args;
}

async function fetchAggregateContext(client, aggregateType, aggregateId) {
  if (aggregateType === "WorkThread") {
    const { data } = await client
      .from("work_threads")
      .select("current_assignee_id, assigned_by")
      .eq("id", aggregateId)
      .maybeSingle();
    if (!data) return null;
    return { currentAssigneeId: data.current_assignee_id, assignedBy: data.assigned_by };
  }
  if (aggregateType === "Deliverable") {
    const { data: deliverable } = await client
      .from("deliverables")
      .select("work_thread_id")
      .eq("id", aggregateId)
      .maybeSingle();
    if (!deliverable) return null;
    return fetchAggregateContext(client, "WorkThread", deliverable.work_thread_id);
  }
  return null;
}

export async function processBatch(client, notifier, appBaseUrl, batchSize = DEFAULT_BATCH_SIZE) {
  const { data: pending, error } = await client
    .from("outbox_messages")
    .select("id, event_id, topic, payload, attempt_count")
    .is("published_at", null)
    .lt("attempt_count", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    throw new Error(`failed to read outbox_messages: ${error.message}`);
  }

  const summary = { processed: 0, sent: 0, skipped: 0, failed: 0, deadLettered: 0 };

  for (const message of pending ?? []) {
    summary.processed += 1;

    const { data: event } = await client
      .from("domain_events")
      .select("aggregate_type, aggregate_id, actor_id")
      .eq("id", message.event_id)
      .maybeSingle();

    if (!event) {
      await client
        .from("outbox_messages")
        .update({ published_at: new Date().toISOString() })
        .eq("id", message.id);
      summary.skipped += 1;
      continue;
    }

    const context = await fetchAggregateContext(client, event.aggregate_type, event.aggregate_id);
    const recipientId = resolveRecipientId(
      { topic: message.topic, payload: message.payload, actorId: event.actor_id },
      context
    );

    if (!recipientId) {
      await client
        .from("outbox_messages")
        .update({ published_at: new Date().toISOString() })
        .eq("id", message.id);
      summary.skipped += 1;
      continue;
    }

    const { data: recipient } = await client
      .from("users")
      .select("email")
      .eq("id", recipientId)
      .maybeSingle();

    if (!recipient?.email) {
      process.stderr.write(
        `[outbox-publisher] no email on file for recipient ${recipientId}, skipping message ${message.id}\n`
      );
      await client
        .from("outbox_messages")
        .update({ published_at: new Date().toISOString() })
        .eq("id", message.id);
      summary.skipped += 1;
      continue;
    }

    const rendered = renderNotification(
      {
        topic: message.topic,
        aggregateId: event.aggregate_id,
        aggregateType: event.aggregate_type
      },
      appBaseUrl
    );
    const result = await notifier.send({
      to: recipient.email,
      subject: rendered.subject,
      text: rendered.text
    });

    if (result.ok) {
      await client
        .from("outbox_messages")
        .update({ published_at: new Date().toISOString() })
        .eq("id", message.id);
      summary.sent += 1;
      continue;
    }

    const nextAttemptCount = message.attempt_count + 1;
    await client
      .from("outbox_messages")
      .update({ attempt_count: nextAttemptCount })
      .eq("id", message.id);
    summary.failed += 1;
    if (nextAttemptCount >= MAX_ATTEMPTS) {
      summary.deadLettered += 1;
      process.stderr.write(
        `[outbox-publisher] DEAD LETTER after ${nextAttemptCount} attempts: message ${message.id} ` +
          `topic=${message.topic} error=${result.error}\n`
      );
    }
  }

  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:4173";

  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const notifier = selectNotifier();
  process.stdout.write(`[outbox-publisher] notifier=${notifier.kind} appBaseUrl=${appBaseUrl}\n`);

  const runOnce = async () => {
    const summary = await processBatch(client, notifier, appBaseUrl);
    process.stdout.write(`[outbox-publisher] ${JSON.stringify(summary)}\n`);
    return summary;
  };

  if (!args.watch) {
    await runOnce();
    return;
  }

  for (;;) {
    await runOnce();
    await new Promise((resolve) => setTimeout(resolve, args.intervalMs));
  }
}

const isMainModule = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((caught) => {
    process.stderr.write(`[outbox-publisher] fatal: ${caught.stack ?? caught}\n`);
    process.exitCode = 1;
  });
}
