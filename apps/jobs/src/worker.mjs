// Cloudflare Worker adapter for the outbox publisher. Thin wrapper only: the actual logic
// (processBatch) is unchanged and stays covered by notify.test.mjs. This file exists solely to
// bridge Workers' `env` binding to the process.env reads that processBatch's dependencies
// (notifiers.mjs) already use, via the `nodejs_compat` flag declared in wrangler.toml.
//
// See .agents/skills/... arh-cloudflare-wrangler-deploy references/worker-from-script.md for the
// conversion pattern this follows.
import { createClient } from "@supabase/supabase-js";
import { selectNotifier } from "./notifiers.mjs";
import { processBatch } from "./outbox-publisher.mjs";

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runOncePass(env));
  },

  // Manual invocation for verification (wrangler dev / a one-off HTTP trigger), mirrors the
  // single-pass CLI mode.
  async fetch(request, env) {
    const summary = await runOncePass(env);
    return new Response(JSON.stringify(summary), {
      headers: { "content-type": "application/json" }
    });
  }
};

async function runOncePass(env) {
  process.env.RESEND_API_KEY = env.RESEND_API_KEY;
  process.env.NOTIFY_FROM_ADDRESS = env.NOTIFY_FROM_ADDRESS;

  const supabaseUrl = requireEnvValue(env, "SUPABASE_URL");
  const serviceRoleKey = requireEnvValue(env, "SUPABASE_SERVICE_ROLE_KEY");
  const appBaseUrl = env.APP_BASE_URL ?? "http://127.0.0.1:4173";

  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const notifier = selectNotifier();
  const summary = await processBatch(client, notifier, appBaseUrl);
  console.log(`[outbox-publisher] notifier=${notifier.kind} appBaseUrl=${appBaseUrl} ${JSON.stringify(summary)}`);
  return summary;
}

function requireEnvValue(env, name) {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required (see apps/jobs/README.md); set via wrangler secret put`);
  }
  return value;
}
