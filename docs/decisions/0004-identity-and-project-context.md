# 0004 — Identity and Project context (WP-020)

Status: Accepted for controlled non-production implementation  
Date: 2026-07-17

## Decision

Identity Access and Project Context are separate modules. Identity Access verifies a bearer token
through Supabase Auth `getUser(token)` and returns only authenticated identity. It does not accept a
typed email or browser-decoded claim as authority.

Project Context independently resolves active organisation membership, active Project membership,
and candidate permissions from reason-carrying role-bundle assignments. Organisation-scoped grants
apply across Projects where the identity is an active member; Project-scoped grants apply only to
their named Project. Revoked and future-dated facts do not apply.

The resolver validates that repository results match the requested identity, organisation, and
Project and fails closed on persistence errors. Its permissions are explicitly named
`candidatePermissions`: record relationship, professional authority, separation of duty, aggregate
guard, and expected version remain later command checks.

The Supabase identity adapter is concrete, but membership persistence remains a port in WP-020.
Final schema and RLS policies remain gated by unsigned Turn 2 operational approval and will be
implemented only within the authorized reference-slice boundary.

## Toolchain security

Vite, Vitest, and the React plugin were upgraded together after `npm audit` identified inherited
development-server vulnerabilities, including Windows path handling. The resolved dependency tree
now reports zero known vulnerabilities.

## Consequence

WP-100 may consume the public actor-context contract. It must treat candidate permission as one
authorization factor, never the entire authorization decision.

