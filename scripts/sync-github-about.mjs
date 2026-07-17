import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const state = JSON.parse(readFileSync(join(process.cwd(), "docs", "project-state.json"), "utf8"));
const apply = process.argv.includes("--apply");
const repositoryPatch = { description: state.description, homepage: state.homepage };
const topicsPatch = { names: state.topics };

if (!apply) {
  process.stdout.write(
    `${JSON.stringify({ repository: state.repository, ...repositoryPatch, topics: state.topics }, null, 2)}\n`
  );
  process.stdout.write(
    "Plan only. Run npm run repo:about:sync after explicit operator authorization.\n"
  );
  process.exit(0);
}

function ghApi(method, endpoint, payload) {
  const result = spawnSync("gh", ["api", "--method", method, endpoint, "--input", "-"], {
    encoding: "utf8",
    input: JSON.stringify(payload),
    stdio: ["pipe", "pipe", "pipe"]
  });
  if (result.status !== 0)
    throw new Error(result.stderr.trim() || `GitHub API ${method} ${endpoint} failed`);
}

ghApi("PATCH", `repos/${state.repository}`, repositoryPatch);
ghApi("PUT", `repos/${state.repository}/topics`, topicsPatch);
process.stdout.write(`GitHub About metadata synchronized for ${state.repository}.\n`);
