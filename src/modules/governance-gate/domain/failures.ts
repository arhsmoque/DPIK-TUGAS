export type GateDecisionFailure =
  | { readonly type: "gate_not_found" }
  | { readonly type: "gate_not_open"; readonly lifecycle: string }
  | { readonly type: "gate_not_deferred"; readonly lifecycle: string }
  | { readonly type: "gate_already_approved" }
  | { readonly type: "invalid_reason" }
  | { readonly type: "invalid_event_time" };

export type GateEvolutionFailure =
  | { readonly type: "event_requires_existing_state"; readonly eventType: string }
  | {
      readonly type: "event_not_applicable";
      readonly eventType: string;
      readonly lifecycle: string;
    };
