# Query Pattern Logging

## What this is, and isn't

`scripts/log-query.mjs` appends one structured record per significant user request to `docs/evidence/query-log.jsonl` (append-only, one JSON object per line). `scripts/analyze-query-patterns.mjs` reads that log and reports which request categories occur often enough (default: 3+) to be worth a human decision on building dedicated automation for them.

This is **not** automatic interception of chat messages. There is no OS-level event for "a human typed something to an AI agent" -- that happens inside whichever agent tool is running (Claude Code, Codex, or otherwise), not in a shell a script can observe from outside. What this gives instead:

1. One consistent command, usable by any agent regardless of tool, to record a request as evidence.
2. For agent runtimes that expose a genuine prompt-submission hook, wiring that hook to this script makes capture automatic *for that runtime* -- see below for Claude Code specifically. Other tools would need their own equivalent hook, if one exists; this repository does not assume every agent has one.

## Manual/agent-invoked logging (works with any tool)

```bash
node scripts/log-query.mjs --text "add npm run build to CI" --actor "cloud-agent" [--category ci-fix] [--outcome "PR #9"] [--work-package WP-130]
```

`--category` is optional; a naive keyword match infers one (`ci-fix`, `docs-sync`, `schema-migration`, `ui-design`, `review`, `architecture`, or `uncategorized`) when omitted. This is a rough heuristic, not a classifier -- pass `--category` explicitly when precision matters.

Any agent working in this repository should call this once per distinct, significant request it receives, as part of its normal evidence trail (alongside `journal.md`/`docs/evidence/` session traces).

## Automatic capture for Claude Code sessions specifically

Claude Code supports a `UserPromptSubmit` hook that fires with the raw prompt text before the agent sees it. Wiring it to the logger removes the need for the agent to remember to call it. Repository-local hook configuration (`.claude/settings.json`, not committed by default since hook configuration is host-specific):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/log-query.mjs --actor claude-code --text \"$(cat)\""
          }
        ]
      }
    ]
  }
}
```

This only applies to Claude Code sessions. A different agent runtime needs its own equivalent mechanism, if one exists -- do not assume this hook fires for every agent working in this repository.

## Turning frequency into an automation decision

```bash
npm run query:analyze -- --threshold 3
```

Writes `docs/evidence/query-pattern-report.md`: every category, its count, and whether it crosses the threshold. A category crossing the threshold is **evidence an automation might be worth building** -- it is not, by itself, authorization to build one. Record the actual decision (build it / not yet / defer) in `docs/decisions/`, same as every other evidence-backed choice in this repository, with a reference to the report that justified it.

## What this file is not

- Not a substitute for `journal.md` (chronological narrative) or `docs/evidence/*.md` (per-session verification proof) -- it's a narrower, structured signal specifically about request *frequency and category*, for one purpose: deciding what's worth automating.
- Not a place for secret values, credentials, or anything sensitive a request might have touched -- log the request's intent, not raw output that could contain what a command returned.
