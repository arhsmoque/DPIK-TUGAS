export type {
  GateType,
  GateLifecycle,
  GateFacts,
  DeferralRecord,
  ApprovalRecord,
  GovernanceGateState
} from "./domain/governance-gate";
export type {
  DeferGate,
  ReconsiderGateDeferral,
  ApproveGate,
  GovernanceGateCommand
} from "./domain/commands";
export type {
  GateDeferred,
  GateDeferralReconsidered,
  GateApproved,
  GovernanceGateEvent
} from "./domain/events";
export type { GateDecisionFailure, GateEvolutionFailure } from "./domain/failures";
export { decide } from "./domain/decide";
export { evolve } from "./domain/evolve";
