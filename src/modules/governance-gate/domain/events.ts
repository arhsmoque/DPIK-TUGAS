import type { ActorId, GovernanceGateId } from "@foundation/ids";

export interface GateDeferred {
  readonly type: "GateDeferred";
  readonly gateId: GovernanceGateId;
  readonly reason: string;
  readonly deferredBy: ActorId;
  readonly deferredAt: Date;
}

export interface GateDeferralReconsidered {
  readonly type: "GateDeferralReconsidered";
  readonly gateId: GovernanceGateId;
  readonly reconsideredBy: ActorId;
  readonly reconsideredAt: Date;
}

export interface GateApproved {
  readonly type: "GateApproved";
  readonly gateId: GovernanceGateId;
  readonly approvedBy: ActorId;
  readonly approvedAt: Date;
}

export type GovernanceGateEvent = GateDeferred | GateDeferralReconsidered | GateApproved;
