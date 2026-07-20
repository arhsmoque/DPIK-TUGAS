import type {
  ActorId,
  ClaimPackageId,
  ClaimRequirementId,
  OrganisationId,
  ProjectId
} from "@foundation/ids";

export type RequirementStatus = "Unsatisfied" | "Satisfied" | "Waived" | "Invalidated";

export type EvidenceKind = "receipt_evidence" | "deliverable";

export interface EvidenceLink {
  readonly kind: EvidenceKind;
  // Structural reference only (Authoritative Fact Reference pattern) -- this
  // module does not import receipt-evidence/deliverable internals to verify
  // the id; the application layer resolves and verifies before linking.
  readonly evidenceId: string;
  readonly linkedBy: ActorId;
  readonly linkedAt: Date;
}

export interface WaiverRecord {
  readonly requestedBy: ActorId;
  readonly requestedAt: Date;
  readonly requestReason: string;
  readonly approvedBy: ActorId | null;
  readonly approvedAt: Date | null;
}

export interface ClaimRequirement {
  readonly requirementId: ClaimRequirementId;
  readonly description: string;
  readonly status: RequirementStatus;
  readonly evidence: EvidenceLink | null;
  readonly waiver: WaiverRecord | null;
  readonly gapNote: string | null;
}

export type ClaimLifecycle = "Open" | "Submitted" | "Closed" | "Cancelled";

export type ClaimReadiness = "EvidenceIncomplete" | "ReadyForQSReview" | "QSVerified";

export interface QsVerification {
  readonly verifiedBy: ActorId;
  readonly verifiedAt: Date;
  readonly notes: string;
}

export interface ClaimFacts {
  readonly claimPackageId: ClaimPackageId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly reference: string;
  readonly description: string;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
}

export interface ClaimState {
  readonly facts: ClaimFacts;
  readonly lifecycle: ClaimLifecycle;
  readonly readiness: ClaimReadiness;
  readonly requirements: readonly ClaimRequirement[];
  readonly qsVerification: QsVerification | null;
}

// Readiness is always derived, never a settable field (BOM-CLAIM-001) -- this
// is the single place that computation happens, called from evolve() after
// every event that changes a requirement's status.
export function deriveReadiness(
  requirements: readonly ClaimRequirement[],
  currentReadiness: ClaimReadiness
): ClaimReadiness {
  if (requirements.length === 0) return "EvidenceIncomplete";
  const allQualify = requirements.every((r) => r.status === "Satisfied" || r.status === "Waived");
  if (!allQualify) return "EvidenceIncomplete";
  return currentReadiness === "QSVerified" ? "QSVerified" : "ReadyForQSReview";
}
