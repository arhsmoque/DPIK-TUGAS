#!/usr/bin/env node
// Basic architecture gate for WP-000. Deliberately simple (regex over import
// statements, no AST) -- it exists to fail loudly on the two violations the
// engineering standard names as prohibited from day one; it can grow more
// precise as src/modules fills in, but must never grow more permissive.
// Core logic lives in architecture-rules.mjs so it's unit-testable without
// depending on real files existing under src/modules.
import { join } from "node:path";
import { checkArchitecture } from "./architecture-rules.mjs";

const repoRoot = new URL("../..", import.meta.url).pathname;
const modulesRoot = join(repoRoot, "src", "modules");

const { violations, filesChecked } = checkArchitecture(modulesRoot);

if (violations.length > 0) {
  console.error(`Architecture gate FAILED (${violations.length} violation(s)):\n`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`Architecture gate passed (${filesChecked} module file(s) checked).`);
