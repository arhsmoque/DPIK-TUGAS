#!/usr/bin/env node
// Basic architecture gate for WP-000/WP-010. Deliberately simple (regex over
// import statements, no AST) -- it exists to fail loudly on the violations
// the engineering standard names as prohibited from day one; it can grow
// more precise as src/modules fills in, but must never grow more permissive.
// Core logic lives in architecture-rules.mjs so it's unit-testable without
// depending on real files existing under src/modules or src/foundation.
import { join } from "node:path";
import { checkArchitecture, checkFoundation } from "./architecture-rules.mjs";

const repoRoot = new URL("../..", import.meta.url).pathname;
const modulesRoot = join(repoRoot, "src", "modules");
const foundationRoot = join(repoRoot, "src", "foundation");

const modulesResult = checkArchitecture(modulesRoot);
const foundationResult = checkFoundation(foundationRoot);
const violations = [...modulesResult.violations, ...foundationResult.violations];

if (violations.length > 0) {
  console.error(`Architecture gate FAILED (${violations.length} violation(s)):\n`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(
  `Architecture gate passed (${modulesResult.filesChecked} module file(s), ${foundationResult.filesChecked} foundation file(s) checked).`
);
