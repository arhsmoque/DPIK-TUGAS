#!/usr/bin/env node
// Reads docs/evidence/query-log.jsonl and reports which request categories
// occur often enough to justify building a dedicated automation for them.
// This is deliberately the whole decision procedure: a category crossing
// the threshold is evidence an automation is *worth considering*, not proof
// it should be built -- a human still decides that, same as every other
// evidence-backed decision in docs/decisions/.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const logPath = join(repoRoot, "docs", "evidence", "query-log.jsonl");
const reportPath = join(repoRoot, "docs", "evidence", "query-pattern-report.md");

const args = process.argv.slice(2);
const thresholdFlagIndex = args.indexOf("--threshold");
const threshold = thresholdFlagIndex >= 0 ? Number(args[thresholdFlagIndex + 1]) : 3;

if (!existsSync(logPath)) {
  console.error(`No query log at ${logPath} yet -- nothing to analyze.`);
  process.exit(1);
}

const lines = readFileSync(logPath, "utf8")
  .split("\n")
  .filter((line) => line.trim().length > 0);
const entries = lines.map((line, index) => {
  try {
    return JSON.parse(line);
  } catch {
    throw new Error(`docs/evidence/query-log.jsonl line ${index + 1} is not valid JSON.`);
  }
});

const byCategory = new Map();
for (const entry of entries) {
  const category = entry.category ?? "uncategorized";
  if (!byCategory.has(category)) byCategory.set(category, []);
  byCategory.get(category).push(entry);
}

const ranked = [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length);

const reportLines = [
  "# Query Pattern Report",
  "",
  `Generated ${new Date().toISOString()} from ${entries.length} logged request(s). Automation threshold: ${threshold}+ occurrences.`,
  "",
  "| Category | Count | Automation candidate? |",
  "| --- | --- | --- |",
  ...ranked.map(
    ([category, items]) =>
      `| ${category} | ${items.length} | ${items.length >= threshold ? "**Yes**" : "Not yet"} |`
  ),
  "",
  "## Detail"
];

for (const [category, items] of ranked) {
  reportLines.push("", `### ${category} (${items.length})`);
  if (items.length >= threshold) {
    reportLines.push(
      "",
      `Crosses the ${threshold}-occurrence threshold -- worth a human decision on whether a dedicated automation/script is justified. Evidence:`
    );
  }
  for (const item of items.slice(-5)) {
    reportLines.push(`- ${item.timestamp} (${item.actor}): ${item.text}`);
  }
  if (items.length > 5) {
    reportLines.push(`- ...and ${items.length - 5} earlier occurrence(s).`);
  }
}

writeFileSync(reportPath, `${reportLines.join("\n")}\n`, "utf8");
process.stdout.write(
  `Wrote ${reportPath} (${entries.length} entries, ${ranked.length} categories).\n`
);

const candidates = ranked.filter(([, items]) => items.length >= threshold);
if (candidates.length > 0) {
  process.stdout.write(
    `Automation candidates (>= ${threshold} occurrences): ${candidates.map(([c]) => c).join(", ")}\n`
  );
}
