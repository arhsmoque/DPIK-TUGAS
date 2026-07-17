import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const state = JSON.parse(readFileSync(join(root, "docs", "project-state.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const migrations = readdirSync(join(root, "supabase", "migrations"))
  .filter((name) => /^\d{14}_.+\.sql$/u.test(name))
  .sort();
const modules = readdirSync(join(root, "src", "modules"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

function managedBlock(name, body) {
  return `<!-- project-docs:${name}:start -->\n${body.trim()}\n<!-- project-docs:${name}:end -->`;
}

function replaceManagedBlock(path, name, body) {
  const start = `<!-- project-docs:${name}:start -->`;
  const end = `<!-- project-docs:${name}:end -->`;
  const current = readFileSync(path, "utf8");
  const startIndex = current.indexOf(start);
  const endIndex = current.indexOf(end);
  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error(`Missing ${name} markers in ${path}`);
  }
  const expected = `${current.slice(0, startIndex)}${managedBlock(name, body)}${current.slice(endIndex + end.length)}`;
  if (current === expected) return false;
  if (checkOnly) throw new Error(`${path} is stale; run npm run docs:update`);
  writeFileSync(path, expected, "utf8");
  return true;
}

function mirrorFile(sourcePath, targetPath) {
  const expected = readFileSync(sourcePath, "utf8");
  let current = null;
  try {
    current = readFileSync(targetPath, "utf8");
  } catch {
    // A missing generated mirror is repaired in update mode and rejected in check mode.
  }
  if (current === expected) return false;
  if (checkOnly) throw new Error(`${targetPath} is stale; run npm run docs:update`);
  mkdirSync(join(root, "apps", "internal", "public"), { recursive: true });
  writeFileSync(targetPath, expected, "utf8");
  return true;
}

const linkRows = state.links
  .map(({ label, url, audience }) => `| [${label}](${url}) | ${audience} |`)
  .join("\n");
const commandRows = [
  "dev",
  "build",
  "typecheck",
  "lint",
  "format",
  "test",
  "test:architecture",
  "docs:update",
  "docs:check"
]
  .filter((name) => packageJson.scripts[name])
  .map((name) => `| \`npm run ${name}\` | \`${packageJson.scripts[name]}\` |`)
  .join("\n");

const readmeBody = `## Project links

| Destination | Intended audience |
| --- | --- |
${linkRows}
| [User guide](user-guide.html) | Staff using My Work |
| [Administrator guide](admin-guide.html) | DPIK application administrators |
| [Developer guide](developer-guide.md) | Local and cloud builders |

## Current verified state

- **Status date:** ${state.statusDate}
- **Stage:** ${state.stage}
- **Runtime:** ${state.runtimeStatus}
- **Approval:** ${state.approvalStatus}
- **Next safe action:** ${state.nextSafeAction}
- **Owned modules:** ${modules.map((name) => `\`${name}\``).join(", ")}
- **Tracked migrations:** ${migrations.length}; latest \`${migrations.at(-1) ?? "none"}\`

## Common commands

| Command | Executes |
| --- | --- |
${commandRows}

This block is generated from \`docs/project-state.json\`, \`package.json\`, the module tree, and tracked migrations. Change the source facts, then run \`npm run docs:update\`.`;

const agentsBody = `## Generated project snapshot

\`\`\`text
Status date: ${state.statusDate}
Stage: ${state.stage}
Runtime: ${state.runtimeStatus}
Approval: ${state.approvalStatus}
Next safe action: ${state.nextSafeAction}
Owned modules: ${modules.join(", ")}
Latest migration: ${migrations.at(-1) ?? "none"}
\`\`\`

Do not expand business screens or schema beyond the startup reference slice before WP-130 security, recovery, idempotency, and browser gates pass.`;

const changed = [
  replaceManagedBlock(join(root, "README.md"), "readme", readmeBody),
  replaceManagedBlock(join(root, "AGENTS.md"), "agents", agentsBody),
  mirrorFile(
    join(root, "user-guide.html"),
    join(root, "apps", "internal", "public", "user-guide.html")
  ),
  mirrorFile(
    join(root, "admin-guide.html"),
    join(root, "apps", "internal", "public", "admin-guide.html")
  )
].some(Boolean);

process.stdout.write(
  checkOnly
    ? "Generated project documentation is current.\n"
    : `Project documentation ${changed ? "updated" : "already current"}.\n`
);
