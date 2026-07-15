Feature: Formal Submission Fulfilment Process

  Scenario: Happy progression reaches Ready for QS Review
    Given a Submission is approved for dispatch
    When a Dispatch Attempt is created and assigned
    And the package is collected and delivered
    And Receipt Evidence is submitted and verified
    And the linked Claim Requirements become satisfied
    And the Claim Package becomes ReadyForQSReview
    Then the process condition is CompletedReadyForQSReview
    And no QS verification is implied

  Scenario: Duplicate event produces one process effect
    Given the process consumed dispatch.package-delivered event E1
    When E1 is delivered again
    Then the prior consumption result is returned
    And no second timer or command is created

  Scenario: Receipt rejection requires business correction
    Given the process is WaitingForEvidenceVerification
    When ReceiptEvidenceRejected is consumed
    Then the process becomes CorrectionDecisionRequired
    And no technical retry is scheduled

  Scenario: Evidence-only correction preserves Dispatch
    Given Receipt Evidence was rejected after a delivered Dispatch
    When authorized Document Control chooses EvidenceReplacement
    Then the process becomes WaitingForReplacementEvidence
    And the delivered Dispatch remains unchanged

  Scenario: Delivery failure requires replacement custody
    Given the process is WaitingForDelivery
    When DeliveryFailed is consumed
    Then the process becomes CorrectionDecisionRequired
    When an authorized coordinator chooses ReplacementDispatch
    Then the process becomes WaitingForReplacementDispatch

  Scenario: Lost command response is resolved by command receipt
    Given the process issued CreateReceiptEvidenceAttempt with command C1
    And C1 committed but its response was lost
    When the reaction retries C1
    Then the prior command receipt is returned
    And no duplicate Evidence Attempt is created

  Scenario: Completion reopens after authoritative invalidation
    Given the process is CompletedReadyForQSReview
    When ReceiptEvidenceVerificationInvalidated is consumed
    Then InvalidateClaimEvidence is issued for exact linked facts
    And the process becomes CorrectionDecisionRequired
    And the earlier completion remains in history

  Scenario: Out-of-order related event is deferred
    Given the process has not yet observed DispatchAssigned
    When a related ReceiptEvidenceAttemptCreated event arrives
    Then the event is DeferredAwaitingPrerequisite
    And it is not discarded
