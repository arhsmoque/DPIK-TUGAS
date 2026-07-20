import { err, ok, type Result } from "@foundation/result";
import type { GovernanceGateState } from "./governance-gate";
import type { GovernanceGateEvent } from "./events";
import type { GateEvolutionFailure } from "./failures";

export function evolve(
  state: GovernanceGateState | null,
  event: GovernanceGateEvent
): Result<GovernanceGateState, GateEvolutionFailure> {
  switch (event.type) {
    case "GateDeferred": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.lifecycle !== "Open") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({
        ...state,
        lifecycle: "Deferred",
        deferral: {
          reason: event.reason,
          deferredBy: event.deferredBy,
          deferredAt: event.deferredAt
        }
      });
    }

    case "GateDeferralReconsidered": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.lifecycle !== "Deferred") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      // The deferral's audit trail lives in domain_events, not the current-state
      // row -- clearing it here mirrors claim's ReopenClaimPackageForCorrection
      // nulling qsVerification on the way back to Open.
      return ok({ ...state, lifecycle: "Open", deferral: null });
    }

    case "GateApproved": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.lifecycle === "Approved") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({
        ...state,
        lifecycle: "Approved",
        approval: { approvedBy: event.approvedBy, approvedAt: event.approvedAt },
        deferral: null
      });
    }
  }
}
