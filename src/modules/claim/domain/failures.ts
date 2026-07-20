export type ClaimDecisionFailure =
  | { readonly type: "claim_already_exists" }
  | { readonly type: "claim_not_found" }
  | { readonly type: "invalid_reference" }
  | { readonly type: "invalid_description" }
  | { readonly type: "invalid_event_time" }
  | { readonly type: "claim_not_open"; readonly lifecycle: string }
  | { readonly type: "requirement_not_found" }
  | { readonly type: "invalid_evidence_reference" }
  | { readonly type: "requirement_not_unsatisfied"; readonly status: string }
  | { readonly type: "invalid_notes" }
  | { readonly type: "invalid_reason" }
  | { readonly type: "waiver_already_pending" }
  | { readonly type: "no_pending_waiver" }
  | { readonly type: "actor_is_waiver_requester" }
  | { readonly type: "claim_not_ready_for_qs_review"; readonly readiness: string }
  | { readonly type: "claim_not_qs_verified"; readonly readiness: string }
  | { readonly type: "claim_not_submitted"; readonly lifecycle: string }
  | { readonly type: "requirement_not_qualifying"; readonly status: string }
  | { readonly type: "claim_not_correctable"; readonly lifecycle: string }
  | { readonly type: "claim_not_cancellable"; readonly lifecycle: string };

export type ClaimEvolutionFailure =
  | { readonly type: "event_requires_empty_state"; readonly eventType: string }
  | { readonly type: "event_requires_existing_state"; readonly eventType: string }
  | {
      readonly type: "event_not_applicable";
      readonly eventType: string;
      readonly lifecycle: string;
    }
  | { readonly type: "requirement_not_found"; readonly eventType: string };
