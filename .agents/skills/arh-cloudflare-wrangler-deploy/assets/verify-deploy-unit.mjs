#!/usr/bin/env node
// Runs every check that could otherwise only surface one at a time across several failed CI
// pushes (see references/known-pitfalls.md) -- lint, a *scoped* format check, typecheck, the
// repo's architecture gate if present, and a wrangler dry-run -- and reports all results together.
// Node stdlib only, no dependencies. Works from any working directory inside the repo.
//
// Usage:
//   node verify-deploy-unit.mjs --wrangler-config apps/jobs/wrangler.toml \
//     --check-path apps/jobs/src/worker.mjs --check-path apps/jobs/wrangler.toml
//
// --wrangler-config is required for a Worker unit. Omit it (or pass --skip-dry-run) for a Pages
// unit that has no per-unit wrangler.toml of its own.
// --check-path may repeat; pass every new/changed file so the format check stays scoped to your
// actual diff instead of the whole repo (see known-pitfalls.md #3 -- a Windows checkout can make
// prettier --check . report unrelated pre-existing drift as if it were yours).

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const args = { wranglerConfig: null, checkPaths: [], skipDryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--wrangler-config") args.wranglerConfig = argv[++i];
    else if (argv[i] === "--check-path") args.checkPaths.push(argv[++i]);
    else if (argv[i] === "--skip-dry-run") args.skipDryRun = true;
  }
  return args;
}

function run(label, command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: true, ...options });
  const ok = result.status === 0;
  return {
    label,
    ok,
    skipped: false,
    output: ok ? "" : (result.stdout || "") + (result.stderr || "")
  };
}

function skip(label, reason) {
  return { label, ok: true, skipped: true, output: reason };
}

// prettier has no built-in parser for wrangler.toml (or other non-JS/TS/JSON/MD/YAML files) --
// passing one to --check fails with "No parser could be inferred", not a real formatting issue.
const PRETTIER_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".css",
  ".html"
]);

function splitByPrettierSupport(paths) {
  const supported = [];
  const unsupported = [];
  for (const path of paths) {
    const dot = path.lastIndexOf(".");
    const ext = dot === -1 ? "" : path.slice(dot).toLowerCase();
    (PRETTIER_EXTENSIONS.has(ext) ? supported : unsupported).push(path);
  }
  return { supported, unsupported };
}

function hasScript(name) {
  if (!existsSync("package.json")) return false;
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  return Boolean(pkg.scripts && pkg.scripts[name]);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const results = [];

  for (const script of ["lint", "typecheck", "test:architecture", "test"]) {
    if (hasScript(script)) {
      results.push(run(`npm run ${script}`, "npm", ["run", script]));
    } else {
      results.push(skip(`npm run ${script}`, "no such script in package.json, skipped"));
    }
  }

  if (args.checkPaths.length > 0) {
    const { supported, unsupported } = splitByPrettierSupport(args.checkPaths);
    if (unsupported.length > 0) {
      results.push(
        skip(
          `prettier --check (${unsupported.length} path(s) skipped, no parser)`,
          `prettier has no parser for: ${unsupported.join(", ")} -- not a formatting issue, just an unsupported extension.`
        )
      );
    }
    if (supported.length > 0) {
      results.push(
        run(`prettier --check (scoped to ${supported.length} path(s))`, "npx", [
          "prettier",
          "--check",
          ...supported
        ])
      );
    }
  } else if (hasScript("format")) {
    results.push(
      skip(
        "prettier --check",
        "no --check-path given; skipped a repo-wide check to avoid false positives from local line-ending drift (see known-pitfalls.md #3). Pass --check-path explicitly."
      )
    );
  }

  if (args.wranglerConfig && !args.skipDryRun) {
    results.push(
      run(`wrangler deploy --dry-run --config ${args.wranglerConfig}`, "npx", [
        "wrangler",
        "deploy",
        "--config",
        args.wranglerConfig,
        "--dry-run"
      ])
    );
  } else if (!args.skipDryRun) {
    results.push(skip("wrangler deploy --dry-run", "no --wrangler-config given, skipped"));
  }

  console.log("");
  console.log("Deploy-unit verification results:");
  console.log("----------------------------------");
  let anyFailed = false;
  for (const result of results) {
    const marker = result.skipped ? "-" : result.ok ? "PASS" : "FAIL";
    console.log(`[${marker}] ${result.label}`);
    if (!result.ok && !result.skipped) {
      anyFailed = true;
      console.log(
        result.output
          .split("\n")
          .slice(-20)
          .map((line) => `    ${line}`)
          .join("\n")
      );
    } else if (result.skipped) {
      console.log(`    ${result.output}`);
    }
  }
  console.log("");

  if (anyFailed) {
    console.error("One or more checks failed -- fix locally before pushing, not in CI.");
    process.exitCode = 1;
  } else {
    console.log("All checks passed.");
  }
}

main();
