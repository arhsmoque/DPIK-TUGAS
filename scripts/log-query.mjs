#!/usr/bin/env node
// Append one structured record of a user request to docs/evidence/query-log.jsonl.
//
// This does not, and cannot, automatically intercept what a user types to an
// agent -- there is no OS-level event for "a human sent a chat message,"
// because that happens inside whichever agent tool is running, not in a
// shell. What this script *can* do is give every agent (any tool, local or
// cloud) one consistent command to call when it receives a significant
// request, so a pattern can accumulate over time regardless of which tool
// is in the seat. For agent runtimes that expose a prompt-submission hook
// (e.g. Claude Code's UserPromptSubmit), wiring that hook to this script
// makes capture automatic for that runtime specifically -- see
// docs/operations/QUERY_LOGGING.md for how, and its limits.
//
// One JSON object per line (JSONL), append-only. Never rewrite or reorder
// existing lines -- this file is itself evidence.
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const logPath = join(repoRoot, "docs", "evidence", "query-log.jsonl");

const CATEGORY_KEYWORDS = [
  { category: "ci-fix", pattern: /\bci\b|workflow|pipeline|github action/i },
  {
    category: "docs-sync",
    pattern: /\breadme\b|\bagents\.md\b|generated doc|docs:update|docs:check/i
  },
  {
    category: "schema-migration",
    pattern: /migration|\bschema\b|\bsql\b|supabase|rls|role.bundle/i
  },
  { category: "ui-design", pattern: /dark mode|mobile|responsive|\bui\b|\bcss\b|theme/i },
  { category: "review", pattern: /\breview\b|\bpr\b|pull request|merge/i },
  { category: "architecture", pattern: /architecture|module boundary|foundation contract/i }
];

function inferCategory(text) {
  for (const { category, pattern } of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return "uncategorized";
}

function parseArgs(argv) {
  const args = { actor: "unspecified-agent", repo: "arhsmoque/DPIK-TUGAS" };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--text") args.text = argv[++i];
    else if (flag === "--category") args.category = argv[++i];
    else if (flag === "--actor") args.actor = argv[++i];
    else if (flag === "--repo") args.repo = argv[++i];
    else if (flag === "--outcome") args.outcome = argv[++i];
    else if (flag === "--work-package") args.workPackage = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (!args.text) {
  console.error(
    'Usage: node scripts/log-query.mjs --text "<request text>" [--actor <name>] [--category <tag>] [--outcome <text>] [--work-package <id>]'
  );
  process.exit(2);
}

const entry = {
  timestamp: new Date().toISOString(),
  actor: args.actor,
  repo: args.repo,
  text: args.text,
  category: args.category ?? inferCategory(args.text),
  outcome: args.outcome ?? null,
  workPackage: args.workPackage ?? null
};

mkdirSync(dirname(logPath), { recursive: true });
appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
process.stdout.write(`Logged (${entry.category}): ${entry.text.slice(0, 80)}\n`);
