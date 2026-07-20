import type { ActorId, GovernanceGateId } from "@foundation/ids";

export interface DeferGate {
  readonly type: "DeferGate";
  readonly gateId: GovernanceGateId;
  readonly reason: string;
  readonly deferredBy: ActorId;
  readonly deferredAt: Date;
}

export interface ReconsiderGateDeferral {
  readonly type: "ReconsiderGateDeferral";
  readonly gateId: GovernanceGateId;
  readonly reconsideredBy: ActorId;
  readonly reconsideredAt: Date;
}

export interface ApproveGate {
  readonly type: "ApproveGate";
  readonly gateId: GovernanceGateId;
  readonly approvedBy: ActorId;
  readonly approvedAt: Date;
}

export type GovernanceGateCommand = DeferGate | ReconsiderGateDeferral | ApproveGate;
