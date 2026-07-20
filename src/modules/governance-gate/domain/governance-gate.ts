import type { ActorId, GovernanceGateId, OrganisationId, ProjectId } from "@foundation/ids";

// One row per (project, gate type), seeded by migration -- there is no
// CreateGate command in this module. Adding a gate type is a new literal
// here plus one seeded governance_gates row and one new
// `governance.approve_gate:<type>` permission, not new code (see AGENTS.md).
export type GateType = "operational_approval";

export type GateLifecycle = "Open" | "Deferred" | "Approved";

export interface GateFacts {
  readonly gateId: GovernanceGateId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly gateType: GateType;
}

export interface DeferralRecord {
  readonly reason: string;
  readonly deferredBy: ActorId;
  readonly deferredAt: Date;
}

export interface ApprovalRecord {
  readonly approvedBy: ActorId;
  readonly approvedAt: Date;
}

export interface GovernanceGateState {
  readonly facts: GateFacts;
  readonly lifecycle: GateLifecycle;
  readonly deferral: DeferralRecord | null;
  readonly approval: ApprovalRecord | null;
}
