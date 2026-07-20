export type DeliverableDecisionFailure =
  | { readonly type: "deliverable_already_exists" }
  | { readonly type: "deliverable_not_found" }
  | { readonly type: "invalid_title" }
  | { readonly type: "invalid_event_time" }
  | { readonly type: "invalid_revision_facts" }
  | { readonly type: "deliverable_not_open_for_submission"; readonly status: string }
  | { readonly type: "deliverable_not_in_review"; readonly status: string }
  | { readonly type: "no_current_revision" }
  | { readonly type: "actor_is_preparer_without_self_approval_flag" }
  | { readonly type: "invalid_review_comments" }
  | { readonly type: "deliverable_already_terminal"; readonly status: string }
  | { readonly type: "invalid_reason" };

export type DeliverableEvolutionFailure =
  | { readonly type: "event_requires_empty_state"; readonly eventType: string }
  | { readonly type: "event_requires_existing_state"; readonly eventType: string }
  | { readonly type: "event_not_applicable"; readonly eventType: string; readonly status: string };
