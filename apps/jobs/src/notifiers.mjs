// Notification port: sendNotification({ to, subject, text }) => Promise<{ ok, error? }>.
// Swap NOTIFIER_KIND to point the worker at a real provider once one is chosen.
// No provider credentials are configured in this environment yet -- see
// apps/jobs/README.md.

/** @param {{ to: string, subject: string, text: string }} message */
async function consoleNotifier(message) {
  process.stdout.write(
    `[outbox-publisher] (console notifier, not actually sent) to=${message.to} subject=${JSON.stringify(
      message.subject
    )}\n`
  );
  return { ok: true };
}

/**
 * Real send via Resend's HTTP API. Dormant until RESEND_API_KEY and
 * NOTIFY_FROM_ADDRESS are set -- selectNotifier() below only returns this
 * when both are present, so an unconfigured environment always falls back
 * to the console notifier rather than failing loudly.
 * @param {{ to: string, subject: string, text: string }} message
 */
async function resendNotifier(message) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_ADDRESS;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to: message.to, subject: message.subject, text: message.text })
    });
    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `resend_http_${response.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (caught) {
    return { ok: false, error: `resend_request_failed: ${String(caught)}` };
  }
}

export function selectNotifier() {
  if (process.env.RESEND_API_KEY && process.env.NOTIFY_FROM_ADDRESS) {
    return { kind: "resend", send: resendNotifier };
  }
  return { kind: "console", send: consoleNotifier };
}
