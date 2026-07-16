# 0002 — Domain continuity at cutover

Status: Accepted (decision), Not yet executed (action)
Date: 2026-07-16

## Current state

Legacy TUGAS is live on Cloudflare Pages:

```text
https://dpiktugas.pages.dev/         -- production alias
https://main.dpiktugas.pages.dev/    -- branch deployment
```

Cloudflare Pages project name: `dpiktugas`, currently connected to `arhsmoque/legacy-DPIK-TUGAS-App`.

## Decision

At cutover, staff must not have to learn or bookmark a new link. The `dpiktugas` Pages project itself is repointed to the canonical build's repository; legacy is moved to a separate project under a different name so it remains browsable during the rollback window rather than being deleted outright.

```text
before cutover:  dpiktugas.pages.dev        -> arhsmoque/legacy-DPIK-TUGAS-App
after cutover:   dpiktugas.pages.dev        -> arhsmoque/DPIK-TUGAS
                 dpiktugas-legacy.pages.dev -> arhsmoque/legacy-DPIK-TUGAS-App (new project, same source)
```

Repointing the existing project's connected repository (rather than creating a new project and redirecting/aliasing) is the mechanism: it preserves the exact URL with no DNS change, no redirect hop, and no custom-domain configuration required, since neither URL is a custom domain today.

## Preconditions before this executes

This is a cutover-stage action, not a WP-000/WP-010-era one. Do not execute until:

```text
1. pilot acceptance reached (per 03_RUNTIME_AND_DEPLOYMENT_ARCHITECTURE.md
   "Coordinated deployment" steps 1-9)
2. legacy writes frozen
3. rollback window plan explicit -- how long dpiktugas-legacy.pages.dev
   (or equivalent) stays reachable before legacy is fully retired
```

## Known gap

This session has no Cloudflare account access -- the actual repoint action (Cloudflare dashboard: Pages project settings -> change connected repository) must be executed manually by whoever holds Cloudflare access, at the cutover stage. This document exists so that action isn't decided from memory months from now.
