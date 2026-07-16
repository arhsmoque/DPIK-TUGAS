Feature: TUGAS five canonical paths

  Scenario: Happy Path reaches Ready for QS Review
    Given an active Project and approved authority fixtures
    When accountable work is assigned and acknowledged
    And an exact Deliverable Revision is approved
    And the exact Revision is placed in an approved Submission
    And the package is delivered
    And Receipt Evidence is professionally verified
    And every mandatory Claim Requirement is satisfied or waived
    Then the Claim Package becomes ReadyForQSReview
    And the Formal Submission Process becomes CompletedReadyForQSReview
    And QSVerified is not implied

  Scenario: Internal Revision preserves R1 and approves R2
    Given Revision R1 is submitted for review
    When the reviewer requests revision
    And the preparer creates Revision R2
    And the reviewer approves exact Revision R2
    Then R1 remains immutable with RevisionRequired history
    And R2 is Approved
    And the Submission manifest may reference R2 but not R1

  Scenario: Rejected receipt requires authorized re-dispatch
    Given Dispatch D1 is Delivered
    And Receipt Evidence Attempt E1 is Rejected
    When an authorized correction actor chooses ReplacementDispatch
    And Dispatch D2 is created and delivered
    And Evidence Attempt E2 is verified
    Then D1 remains Delivered
    And E1 remains Rejected
    And the Claim evaluation uses E2
    And technical retry did not choose the replacement

  Scenario: Overdue and expiry do not corrupt lifecycle
    Given a Work Thread is InProgress
    When its due timer is evaluated after the due instant
    Then WorkBecameOverdue is accepted
    And its lifecycle remains InProgress
    Given Delivery Access A1 for an Assigned Dispatch
    When A1 expires
    Then the Dispatch remains Assigned
    And A1 cannot perform an action
    And a new access aggregate may be issued

  Scenario: Claim Gap blocks readiness
    Given the Deliverable is Approved
    And the Submission exists
    And the Dispatch is Delivered
    But mandatory receipt evidence is Rejected
    When the Claim Requirement is evaluated
    Then ClaimRequirementGapRecorded is accepted
    And the Claim Package remains EvidenceIncomplete
    And the gap shows an owner and next action
    When replacement Evidence is verified and the requirement is satisfied
    Then the Claim Package may become ReadyForQSReview
