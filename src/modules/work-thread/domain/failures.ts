export type WorkThreadDecisionFailure =
  | { readonly type: "work_thread_already_exists" }
  | { readonly type: "work_thread_not_found" }
  | { readonly type: "invalid_title" }
  | { readonly type: "invalid_expected_outcome" }
  | { readonly type: "invalid_source_reference" }
  | { readonly type: "invalid_event_time" }
  | { readonly type: "work_thread_not_unassigned"; readonly lifecycle: string }
  | { readonly type: "invalid_assignment_reason" }
  | { readonly type: "invalid_due_commitment" }
  | { readonly type: "assignment_not_awaiting_acknowledgement"; readonly lifecycle: string }
  | { readonly type: "actor_not_current_assignee" }
  | { readonly type: "invalid_acknowledgement_time" }
  | { readonly type: "work_thread_not_assigned"; readonly lifecycle: string }
  | { readonly type: "work_thread_not_active"; readonly lifecycle: string }
  | { readonly type: "invalid_note" }
  | { readonly type: "blocker_already_open" }
  | { readonly type: "no_open_blocker" }
  | { readonly type: "actor_not_required_resolver" }
  | { readonly type: "invalid_resolution_note" }
  | { readonly type: "no_current_assignment" }
  | { readonly type: "work_thread_not_in_progress"; readonly lifecycle: string }
  | { readonly type: "work_thread_not_awaiting_acceptance"; readonly lifecycle: string }
  | { readonly type: "work_thread_not_closed"; readonly lifecycle: string }
  | { readonly type: "work_thread_already_terminal"; readonly lifecycle: string }
  | { readonly type: "invalid_reason" }
  | { readonly type: "recall_already_pending" }
  | { readonly type: "no_pending_recall" }
  | { readonly type: "actor_not_recall_requester" }
  | { readonly type: "renegotiation_already_pending" }
  | { readonly type: "no_pending_renegotiation" }
  | { readonly type: "actor_not_renegotiation_requester" }
  | { readonly type: "reason_detail_required_for_other" };

export type WorkThreadEvolutionFailure =
  | { readonly type: "event_requires_empty_state"; readonly eventType: string }
  | { readonly type: "event_requires_existing_state"; readonly eventType: string }
  | {
      readonly type: "event_not_applicable";
      readonly eventType: string;
      readonly lifecycle: string;
    }
  | {
      readonly type: "assignment_sequence_mismatch";
      readonly expected: number;
      readonly actual: number;
    }
  | { readonly type: "acknowledgement_actor_mismatch" };
