import { err, ok, type Result } from "@foundation/result";
import { deriveReadiness, type ClaimRequirement, type ClaimState } from "./claim";
import type { ClaimEvent } from "./events";
import type { ClaimEvolutionFailure } from "./failures";

function replaceRequirement(
  requirements: readonly ClaimRequirement[],
  requirementId: string,
  update: (requirement: ClaimRequirement) => ClaimRequirement
): readonly ClaimRequirement[] | null {
  let found = false;
  const next = requirements.map((requirement) => {
    if (requirement.requirementId !== requirementId) return requirement;
    found = true;
    return update(requirement);
  });
  return found ? next : null;
}

export function evolve(
  state: ClaimState | null,
  event: ClaimEvent
): Result<ClaimState, ClaimEvolutionFailure> {
  switch (event.type) {
    case "ClaimPackageCreated": {
      if (state !== null) return err({ type: "event_requires_empty_state", eventType: event.type });
      return ok({
        facts: {
          claimPackageId: event.claimPackageId,
          organisationId: event.organisationId,
          projectId: event.projectId,
          reference: event.reference,
          description: event.description,
          createdBy: event.createdBy,
          createdAt: event.createdAt
        },
        lifecycle: "Open",
        readiness: "EvidenceIncomplete",
        requirements: [],
        qsVerification: null
      });
    }

    case "ClaimRequirementAdded": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      const requirements = [
        ...state.requirements,
        {
          requirementId: event.requirementId,
          description: event.description,
          status: "Unsatisfied" as const,
          evidence: null,
          waiver: null,
          gapNote: null
        }
      ];
      return ok({
        ...state,
        requirements,
        readiness: deriveReadiness(requirements, state.readiness)
      });
    }

    case "ClaimEvidenceLinked": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      const requirements = replaceRequirement(state.requirements, event.requirementId, (r) => ({
        ...r,
        evidence: {
          kind: event.evidenceKind,
          evidenceId: event.evidenceId,
          linkedBy: event.linkedBy,
          linkedAt: event.linkedAt
        }
      }));
      if (requirements === null)
        return err({ type: "requirement_not_found", eventType: event.type });
      return ok({ ...state, requirements });
    }

    case "RequirementSatisfied": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      const requirements = replaceRequirement(state.requirements, event.requirementId, (r) => ({
        ...r,
        status: "Satisfied",
        gapNote: null
      }));
      if (requirements === null)
        return err({ type: "requirement_not_found", eventType: event.type });
      return ok({
        ...state,
        requirements,
        readiness: deriveReadiness(requirements, state.readiness)
      });
    }

    case "GapRecorded": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      const requirements = replaceRequirement(state.requirements, event.requirementId, (r) => ({
        ...r,
        status: "Unsatisfied",
        gapNote: event.notes
      }));
      if (requirements === null)
        return err({ type: "requirement_not_found", eventType: event.type });
      return ok({
        ...state,
        requirements,
        readiness: deriveReadiness(requirements, state.readiness)
      });
    }

    case "WaiverRequested": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      const requirements = replaceRequirement(state.requirements, event.requirementId, (r) => ({
        ...r,
        waiver: {
          requestedBy: event.requestedBy,
          requestedAt: event.requestedAt,
          requestReason: event.reason,
          approvedBy: null,
          approvedAt: null
        }
      }));
      if (requirements === null)
        return err({ type: "requirement_not_found", eventType: event.type });
      return ok({ ...state, requirements });
    }

    case "ClaimRequirementWaived": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      const requirements = replaceRequirement(state.requirements, event.requirementId, (r) => ({
        ...r,
        status: "Waived",
        waiver: r.waiver && {
          ...r.waiver,
          approvedBy: event.approvedBy,
          approvedAt: event.approvedAt
        }
      }));
      if (requirements === null)
        return err({ type: "requirement_not_found", eventType: event.type });
      return ok({
        ...state,
        requirements,
        readiness: deriveReadiness(requirements, state.readiness)
      });
    }

    case "ClaimPackageQSVerified": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.readiness !== "ReadyForQSReview") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({
        ...state,
        readiness: "QSVerified",
        qsVerification: {
          verifiedBy: event.verifiedBy,
          verifiedAt: event.verifiedAt,
          notes: event.notes
        }
      });
    }

    case "ClaimSubmissionRecorded": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.lifecycle !== "Open") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({ ...state, lifecycle: "Submitted" });
    }

    case "ClaimPackageClosed": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.lifecycle !== "Submitted") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({ ...state, lifecycle: "Closed" });
    }

    case "ClaimRequirementInvalidated": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      const requirements = replaceRequirement(state.requirements, event.requirementId, (r) => ({
        ...r,
        status: "Invalidated"
      }));
      if (requirements === null)
        return err({ type: "requirement_not_found", eventType: event.type });
      return ok({
        ...state,
        requirements,
        readiness: deriveReadiness(requirements, state.readiness)
      });
    }

    case "ClaimPackageReopenedForCorrection": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.lifecycle !== "Submitted" && state.lifecycle !== "Closed") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      // CL-13: reopening always lands on Open + EvidenceIncomplete, even if
      // every requirement still qualifies -- correction requires the QS
      // re-verification step to happen again, not a readiness carry-over.
      return ok({
        ...state,
        lifecycle: "Open",
        readiness: "EvidenceIncomplete",
        qsVerification: null
      });
    }

    case "ClaimPackageCancelled": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.lifecycle !== "Open") {
        return err({
          type: "event_not_applicable",
          eventType: event.type,
          lifecycle: state.lifecycle
        });
      }
      return ok({ ...state, lifecycle: "Cancelled" });
    }
  }
}
