# 0007 — Generated public guide copies are build output, not committed files

Status: Accepted
Date: 2026-07-18

## Decision

`apps/internal/public/{user,admin}-guide.html` are no longer committed to git. They are generated at build/dev time by `scripts/copy-public-docs.mjs`, wired into `prebuild`/`predev` npm lifecycle hooks, from the root `user-guide.html`/`admin-guide.html`.

## Why

PR #7 introduced these as a committed mirror, checked for staleness by `npm run docs:check`. PR #8 edited the root guide files (dark mode, mobile CSS) without regenerating the mirror, and `docs:check` correctly failed CI — but the underlying design guarantees this will recur, since it depends on every future edit remembering a manual sync step.

Removing the committed mirror removes the possibility of the bug class entirely: there is nothing left that can go stale, because nothing is committed to compare against. `npm run build` and `npm run dev` both regenerate the copy automatically via `prebuild`/`predev`, so no one has to remember an extra command.

## Consequence

`scripts/sync-project-docs.mjs` (and `docs:check`/`docs:update`) now only manage the README/AGENTS generated blocks (status, stage, module list, migration count) sourced from `docs/project-state.json` -- content that legitimately belongs in git, since it's read on GitHub without a build step. Guide-file mirroring moved to `scripts/copy-public-docs.mjs`, which is unconditional (no check mode) since there is no committed state to check.
