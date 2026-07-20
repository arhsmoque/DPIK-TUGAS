export type DispatchDecisionFailure =
  | { readonly type: "dispatch_already_exists" }
  | { readonly type: "dispatch_not_found" }
  | { readonly type: "invalid_destination" }
  | { readonly type: "invalid_recipient_contact" }
  | { readonly type: "invalid_package_summary" }
  | { readonly type: "invalid_event_time" }
  | { readonly type: "dispatch_not_prepared"; readonly status: string }
  | { readonly type: "invalid_custodian" }
  | { readonly type: "dispatch_not_assigned"; readonly status: string }
  | { readonly type: "dispatch_not_in_transit"; readonly status: string }
  | { readonly type: "invalid_delivered_to" }
  | { readonly type: "dispatch_not_failable"; readonly status: string }
  | { readonly type: "invalid_reason" }
  | { readonly type: "dispatch_not_cancellable"; readonly status: string };

export type DispatchEvolutionFailure =
  | { readonly type: "event_requires_empty_state"; readonly eventType: string }
  | { readonly type: "event_requires_existing_state"; readonly eventType: string }
  | { readonly type: "event_not_applicable"; readonly eventType: string; readonly status: string };
