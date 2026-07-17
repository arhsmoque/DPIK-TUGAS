import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const expectedProjectRef = "mwvvtbgxnruxgjbffifd";
const requiredMigrations = [
  "supabase/migrations/20260718010000_startup_reference_slice.sql",
  "supabase/migrations/20260718011000_fix_assign_work_parameter.sql"
];
const requiredSecrets = [
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY"
];

function run(command, args, options = {}) {
  const useBundledNpx = command === "npx";
  const executable = useBundledNpx ? process.execPath : command;
  const effectiveArgs = useBundledNpx
    ? [join(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"), ...args]
    : args;
  const result = spawnSync(executable, effectiveArgs, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit"
  });
  if (result.status !== 0) {
    const detail = options.capture ? result.stderr.trim() : "";
    const cause = result.error instanceof Error ? result.error.message : detail;
    throw new Error(`${command} ${args.join(" ")} failed${cause ? `: ${cause}` : ""}`);
  }
  return options.capture ? result.stdout.trim() : "";
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const root = run("git", ["rev-parse", "--show-toplevel"], { capture: true });
  const remote = run("git", ["remote", "get-url", "origin"], { cwd: root, capture: true });
  requireCondition(
    /arhsmoque[/:]DPIK-TUGAS(?:\.git)?$/i.test(remote),
    `Unexpected origin: ${remote}`
  );

  run("git", ["fetch", "origin"], { cwd: root });
  const status = run("git", ["status", "--porcelain"], { cwd: root, capture: true });
  requireCondition(status.length === 0, "Working tree is not clean.");

  const divergence = run("git", ["rev-list", "--left-right", "--count", "HEAD...origin/main"], {
    cwd: root,
    capture: true
  });
  const [aheadText, behindText] = divergence.split(/\s+/u);
  const ahead = Number.parseInt(aheadText, 10);
  const behind = Number.parseInt(behindText, 10);
  requireCondition(
    Number.isInteger(ahead) && Number.isInteger(behind),
    `Unreadable Git divergence: ${divergence}`
  );
  requireCondition(
    behind === 0,
    `HEAD is behind origin/main by ${behind} commit(s); update before remote work.`
  );

  for (const relativePath of requiredMigrations) {
    requireCondition(
      existsSync(join(root, relativePath)),
      `Missing migration file: ${relativePath}`
    );
    run("git", ["ls-files", "--error-unmatch", relativePath], { cwd: root, capture: true });
  }

  const linkedRefPath = join(root, "supabase", ".temp", "project-ref");
  requireCondition(existsSync(linkedRefPath), "Supabase project is not linked in this checkout.");
  const linkedRef = readFileSync(linkedRefPath, "utf8").trim();
  requireCondition(linkedRef === expectedProjectRef, `Unexpected linked project: ${linkedRef}`);

  const secretOutput = run("gh", ["secret", "list", "--repo", "arhsmoque/DPIK-TUGAS"], {
    cwd: root,
    capture: true
  });
  const configuredSecrets = new Set(
    secretOutput
      .split(/\r?\n/u)
      .map((line) => line.split(/\s+/u)[0])
      .filter(Boolean)
  );
  const missingSecrets = requiredSecrets.filter((name) => !configuredSecrets.has(name));
  requireCondition(
    missingSecrets.length === 0,
    `Missing GitHub secret names: ${missingSecrets.join(", ")}`
  );

  run("npx", ["supabase@2.109.1", "migration", "list", "--linked"], { cwd: root });
  run("npx", ["supabase@2.109.1", "db", "lint", "--linked", "--level", "error"], { cwd: root });

  const head = run("git", ["rev-parse", "--short", "HEAD"], { cwd: root, capture: true });
  process.stdout.write(
    `Cloud-ops preflight passed at ${head} (${ahead} ahead of origin/main) for ${expectedProjectRef}.\n`
  );
} catch (error) {
  process.stderr.write(
    `Cloud-ops preflight failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
}
