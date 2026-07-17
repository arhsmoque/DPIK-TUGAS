# Project Context

Resolves a verified identity into an active organisation/Project actor context and derives candidate
permissions from active, reason-carrying role-bundle assignments.

The resolver is deny-by-default. Organisation membership, Project membership, assignment scope, and
permission are evaluated independently. Its result is intentionally named `candidatePermissions`:
record relationship, professional authority, separation of duty, transition guards, and optimistic
version checks remain the responsibility of the command being executed.

