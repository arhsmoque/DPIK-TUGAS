export type ReceiptEvidenceDecisionFailure =
  | { readonly type: "receipt_evidence_already_exists" }
  | { readonly type: "receipt_evidence_not_found" }
  | { readonly type: "invalid_event_time" }
  | { readonly type: "receipt_evidence_not_collecting"; readonly status: string }
  | { readonly type: "invalid_evidence_item" }
  | { readonly type: "empty_evidence" }
  | { readonly type: "receipt_evidence_not_pending_verification"; readonly status: string }
  | { readonly type: "verifier_is_only_uploader_without_self_verified_flag" }
  | { readonly type: "invalid_verification_notes" }
  | { readonly type: "invalid_reason" }
  | { readonly type: "receipt_evidence_not_withdrawable"; readonly status: string }
  | { readonly type: "receipt_evidence_not_verified"; readonly status: string };

export type ReceiptEvidenceEvolutionFailure =
  | { readonly type: "event_requires_empty_state"; readonly eventType: string }
  | { readonly type: "event_requires_existing_state"; readonly eventType: string }
  | { readonly type: "event_not_applicable"; readonly eventType: string; readonly status: string };
