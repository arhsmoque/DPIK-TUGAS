# AGENTS.md — DPIK TUGAS Canonical Engineering Bundle

## Mission

Build the canonical first production release of DPIK TUGAS as a secure accountability and submission-evidence system.

## Product boundary

TUGAS owns accountability, guarded workflow state, review history, submission manifests, physical custody attempts, receipt-evidence decisions, claim-evidence readiness and visible audit history.

TUGAS does not replace Gmail, Outlook, WhatsApp, Drive, SharePoint, CAD, Word or Excel.

## Architecture

- module-first modular monolith;
- domain-driven aggregate boundaries;
- hexagonal dependency direction;
- commands mutate, queries read;
- append-only business events;
- transactional outbox;
- explicit Process Manager for mandatory cross-aggregate progression;
- projections for attention and management views;
- Supabase/PostgreSQL persistence with deny-by-default RLS;
- React UI through application contracts only.

## Hard constraints

- No UI component may mutate protected tables directly.
- Domain code may not import React, Supabase, HTTP, storage or provider SDKs.
- Application handlers may not receive framework request objects.
- Modules interact only through public APIs, published events or purpose-specific ports.
- Every table and Domain Event has one owner.
- Business rejection is an explicit transition, never an automatic technical retry.
- Replacement revisions, dispatches and evidence create new historical attempts.
- Physical delivery, receipt verification and claim readiness remain separate truths.
- Admin authority does not imply professional approval authority.
- No generic status mutation or generic workflow/rules engine.
- No database edits as ordinary recovery.

## Required proof

- accepted and rejected domain tests;
- negative authorization and RLS tests;
- adapter contract tests;
- immutable-history proof;
- idempotency proof;
- projection freshness and rebuild parity;
- five canonical workflow paths;
- health breadcrumbs;
- mismatch observation for critical outputs.

## Current gate

`BLOCKED_PENDING_TURN_2_OPERATIONAL_APPROVAL`
