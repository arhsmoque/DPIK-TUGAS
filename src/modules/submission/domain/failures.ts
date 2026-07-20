export type SubmissionDecisionFailure =
  | { readonly type: "submission_already_exists" }
  | { readonly type: "submission_not_found" }
  | { readonly type: "invalid_reference" }
  | { readonly type: "invalid_recipient_name" }
  | { readonly type: "invalid_package_summary" }
  | { readonly type: "invalid_event_time" }
  | { readonly type: "submission_not_draft"; readonly status: string }
  | { readonly type: "invalid_manifest_item" }
  | { readonly type: "empty_manifest" }
  | { readonly type: "submission_not_prepared"; readonly status: string }
  | { readonly type: "invalid_credential_reference" }
  | { readonly type: "submission_not_cancellable"; readonly status: string }
  | { readonly type: "submission_not_supersedable"; readonly status: string }
  | { readonly type: "invalid_reason" };

export type SubmissionEvolutionFailure =
  | { readonly type: "event_requires_empty_state"; readonly eventType: string }
  | { readonly type: "event_requires_existing_state"; readonly eventType: string }
  | { readonly type: "event_not_applicable"; readonly eventType: string; readonly status: string };
