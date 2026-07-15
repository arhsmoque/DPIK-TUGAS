# Turn 6 — Event-to-Command Reaction Matrix

Status: `PROCESS REACTION CONTRACT ESTABLISHED`

## Reaction grammar

```text
Current process condition
+ validated published event
+ authoritative fact references
+ bound process configuration
→ process decision
→ process event(s)
→ optional issued command(s)
→ next condition
```

Every issued command has a stable command ID and idempotency key derived from the process reaction identity.

## Normal progression

| ID | Consumed event | Required condition | Process action | Issued command | Next condition |
|---|---|---|---|---|---|
| `PF-01` | `submission.approved-for-dispatch.v1` | no active process | start process and bind Submission/configuration | none | `WaitingForDispatchCreation` |
| `PF-02` | `dispatch.attempt-created.v1` or `dispatch.replacement-created.v1` | waiting for Dispatch creation/replacement | validate Submission reference and set current Attempt | none | `WaitingForDispatchAssignment` |
| `PF-03` | `dispatch.assigned.v1` | waiting for assignment | record assignment, create collection timer and ensure collecting Evidence Attempt | `CreateReceiptEvidenceAttempt` if absent | `WaitingForCollection` |
| `PF-04` | `receipt-evidence.attempt-created.v1` or replacement-created | related waiting condition | link current Evidence Attempt | none | preserve custody condition or `WaitingForEvidenceSubmission` |
| `PF-05` | `dispatch.package-collected.v1` | `WaitingForCollection` | cancel collection timer and create delivery timer | none | `WaitingForDelivery` |
| `PF-06` | `dispatch.package-delivered.v1` | `WaitingForDelivery` | cancel delivery timer and create proof-submission timer | none | `WaitingForEvidenceSubmission` |
| `PF-07` | `receipt-evidence.item-uploaded.v1` | current collecting Attempt | record observation only | none | unchanged |
| `PF-08` | `receipt-evidence.submitted-for-verification.v1` | `WaitingForEvidenceSubmission` | freeze waiting set and create verification timer | none | `WaitingForEvidenceVerification` |
| `PF-09` | `receipt-evidence.verified.v1` | `WaitingForEvidenceVerification` | bind verified fact and inspect Claim binding | `EvaluateClaimRequirement` | `WaitingForClaimEvaluation` or `WaitingForClaimBinding` |
| `PF-10` | requirement satisfied/waived | `WaitingForClaimEvaluation` | update requirement observations | `RecalculateClaimReadiness` when complete | `WaitingForClaimEvaluation` |
| `PF-11` | `claim.requirement-gap-recorded.v1` | `WaitingForClaimEvaluation` | record gap and accountable owner | none | `CorrectionDecisionRequired` |
| `PF-12` | `claim.ready-for-qs-review.v1` | `WaitingForClaimEvaluation` | cancel timers and record successful completion | none | `CompletedReadyForQSReview` |

## Failure and invalidation reactions

| ID | Consumed event | Required condition | Process action | Issued command | Next condition |
|---|---|---|---|---|---|
| `PF-20` | `dispatch.delivery-failed.v1` | waiting for collection/delivery | record failed Attempt and stop custody timers | none | `CorrectionDecisionRequired` |
| `PF-21` | `receipt-evidence.rejected.v1` | waiting for verification | record verifier reasons | none | `CorrectionDecisionRequired` |
| `PF-22` | verification invalidated | Claim evaluation or completed | bind invalidation and invalidate linked Claim evidence | `InvalidateClaimEvidence` | `CorrectionDecisionRequired` |
| `PF-23` | Claim Requirement invalidated | Claim evaluation or completed | record affected requirement and prior completion | none | `CorrectionDecisionRequired` |
| `PF-24` | `submission.cancelled.v1` | before custody begins | cancel process and timers | none | `Cancelled` |
| `PF-25` | `submission.superseded.v1` | any active condition | stop progression and record successor | none | `Cancelled` or `CorrectionDecisionRequired` |
| `PF-26` | `project.closed.v1` | any active condition | apply approved closure policy | none | `Cancelled` or technically blocked |

## Correction-selection commands

| Command | Allowed condition | Recommended authority | Resulting process event | Next condition |
|---|---|---|---|---|
| `ChooseEvidenceReplacement` | `CorrectionDecisionRequired` | Document Control / Evidence coordinator | `EvidenceReplacementChosen` | `WaitingForReplacementEvidence` |
| `ChooseReplacementDispatch` | `CorrectionDecisionRequired` | Dispatch Coordinator plus required approval | `ReplacementDispatchChosen` | `WaitingForReplacementDispatch` |
| `ChooseClaimEvidenceCorrection` | `CorrectionDecisionRequired` | QS / Finance | `ClaimEvidenceCorrectionChosen` | Claim evaluation or replacement-evidence wait |
| `CancelFulfilmentProcess` | `CorrectionDecisionRequired` | authority matching Submission/Claim impact | `FulfilmentProcessCancelled` | `Cancelled` |
| `BindClaimScope` | `WaitingForClaimBinding` | QS / Finance | `ClaimScopeBound` | `WaitingForClaimEvaluation` |

Correction selection records intent. It does not create a replacement aggregate automatically.

## Events that do not advance mandatory coordination

```text
delivery-access.issued.v1
delivery-access.rotated.v1
delivery-access.expired.v1
receipt-evidence.item-uploaded.v1
notification delivery
projection update
```

These may update attention, projections, audit or telemetry.

## Human-required decisions

```text
create/assign Dispatch
choose evidence-only versus re-dispatch
create replacement aggregates
verify Receipt Evidence
approve waiver
perform QS verification
```
