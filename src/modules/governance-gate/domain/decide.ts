import { err, ok, type Result } from "@foundation/result";
import type {
  ApproveGate,
  DeferGate,
  GovernanceGateCommand,
  ReconsiderGateDeferral
} from "./commands";
import type { GovernanceGateState } from "./governance-gate";
import type { GovernanceGateEvent } from "./events";
import type { GateDecisionFailure } from "./failures";

type Decision = Result<readonly GovernanceGateEvent[], GateDecisionFailure>;

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

// Authorization (who may defer/reconsider/approve) is enforced entirely at
// the SQL RPC layer via has_project_permission, not here -- same split as
// the claim module. decide.ts only validates state-machine legality and
// field validity.

function decideDefer(state: GovernanceGateState | null, command: DeferGate): Decision {
  if (state === null) return err({ type: "gate_not_found" });
  if (state.lifecycle !== "Open") {
    return err({ type: "gate_not_open", lifecycle: state.lifecycle });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.deferredAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "GateDeferred",
      gateId: command.gateId,
      reason: command.reason.trim(),
      deferredBy: command.deferredBy,
      deferredAt: command.deferredAt
    }
  ]);
}

function decideReconsider(
  state: GovernanceGateState | null,
  command: ReconsiderGateDeferral
): Decision {
  if (state === null) return err({ type: "gate_not_found" });
  if (state.lifecycle !== "Deferred") {
    return err({ type: "gate_not_deferred", lifecycle: state.lifecycle });
  }
  if (!isValidDate(command.reconsideredAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "GateDeferralReconsidered",
      gateId: command.gateId,
      reconsideredBy: command.reconsideredBy,
      reconsideredAt: command.reconsideredAt
    }
  ]);
}

// Approval is the strictly stronger state: legal from both Open and
// Deferred, and clears any active deferral -- there is no separate
// "reconsider before approving" step required. See module AGENTS.md.
function decideApprove(state: GovernanceGateState | null, command: ApproveGate): Decision {
  if (state === null) return err({ type: "gate_not_found" });
  if (state.lifecycle === "Approved") return err({ type: "gate_already_approved" });
  if (!isValidDate(command.approvedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "GateApproved",
      gateId: command.gateId,
      approvedBy: command.approvedBy,
      approvedAt: command.approvedAt
    }
  ]);
}

export function decide(
  state: GovernanceGateState | null,
  command: GovernanceGateCommand
): Decision {
  switch (command.type) {
    case "DeferGate":
      return decideDefer(state, command);
    case "ReconsiderGateDeferral":
      return decideReconsider(state, command);
    case "ApproveGate":
      return decideApprove(state, command);
  }
}
