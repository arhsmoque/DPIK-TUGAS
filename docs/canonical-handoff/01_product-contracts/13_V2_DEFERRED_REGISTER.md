# 13 — V2 Deferred Register

The following must not delay V1.

## Communication and AI

- Gmail and Outlook automatic ingestion
- WhatsApp monitoring
- meeting-minute extraction
- automatic project detection
- AI task extraction
- AI summarisation and classification

## Documents

- OCR of stamps and signatures
- automatic Word/PDF/CAD comparison
- semantic document search
- AI evidence judgment
- autonomous professional approval

## Logistics

- courier API integration
- live GPS maps
- route optimisation
- fleet management
- native driver application
- offline-first delivery

## Platform

- generic workflow builder
- page builder
- arbitrary custom fields
- plugin marketplace
- commercial multi-tenancy
- billing
- client portal
- native mobile application

## Regulatory and permit tracking

- dedicated permit-tracking screens and permit-specific evidence rules
- authority-relationship management beyond generic Submission recipient typing

V1 keeps `Submission` recipient typing generic (client or authority) so this is a screen added later, not a data-model change — see `04_ROLE_AND_AUTHORIZATION_MATRIX.md`.

## Project and commercial systems

- programme scheduling engine
- resource planning
- full contract administration
- claim valuation
- payment certificate calculation
- accounting integration

## Architecture

- Temporal unless validated complexity proves it necessary
- distributed microservices
- universal event sourcing
- cross-region active-active deployment

Passive interfaces may be preserved, but no deferred capability may become a V1 dependency.
