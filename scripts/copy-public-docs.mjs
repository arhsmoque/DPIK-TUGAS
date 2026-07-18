#!/usr/bin/env node
// Copies the root user/admin guides into apps/internal/public/ so Vite can
// serve them as static assets (anything in public/ is copied to dist/ as-is
// at build time; Vite cannot read files outside public/ directly).
//
// Deliberately unconditional and gitignored on the target side: earlier this
// was a committed mirror checked by docs:check, which meant editing the root
// guide without remembering to also run docs:update left committed files
// out of sync with their own source (see PR #8). Making the copy a build-time
// step instead of a tracked file removes the possibility of that drift
// entirely -- there is nothing committed left to go stale.
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const targetDir = join(root, "apps", "internal", "public");
mkdirSync(targetDir, { recursive: true });

for (const name of ["user-guide.html", "admin-guide.html"]) {
  copyFileSync(join(root, name), join(targetDir, name));
}

process.stdout.write("Copied user-guide.html and admin-guide.html into apps/internal/public/.\n");
