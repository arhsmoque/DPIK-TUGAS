import { err, ok, type Result } from "@foundation/result";
import type { DispatchState } from "./dispatch";
import type { DispatchEvent } from "./events";
import type { DispatchEvolutionFailure } from "./failures";

export function evolve(
  state: DispatchState | null,
  event: DispatchEvent
): Result<DispatchState, DispatchEvolutionFailure> {
  switch (event.type) {
    case "DispatchAttemptCreated":
    case "ReplacementDispatchCreated": {
      if (state !== null) return err({ type: "event_requires_empty_state", eventType: event.type });
      return ok({
        facts: {
          dispatchAttemptId: event.dispatchAttemptId,
          submissionId: event.submissionId,
          organisationId: event.organisationId,
          projectId: event.projectId,
          destination: event.destination,
          recipientContact: event.recipientContact,
          packageSummary: event.packageSummary,
          replacesDispatchAttemptId: event.replacesDispatchAttemptId,
          createdBy: event.createdBy,
          createdAt: event.createdAt
        },
        status: "Prepared",
        custodian: null,
        deliveredTo: null,
        failureReason: null
      });
    }

    case "DispatchAssigned": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Prepared") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({
        ...state,
        status: "Assigned",
        custodian: {
          custodianType: event.custodianType,
          custodianActorId: event.custodianActorId,
          custodianName: event.custodianName
        }
      });
    }

    case "PackageCollected": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Assigned") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({ ...state, status: "InTransit" });
    }

    case "PackageDelivered": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "InTransit") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({ ...state, status: "Delivered", deliveredTo: event.deliveredTo });
    }

    case "DeliveryFailed": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Assigned" && state.status !== "InTransit") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({ ...state, status: "Failed", failureReason: event.reason });
    }

    case "DispatchCancelled": {
      if (state === null)
        return err({ type: "event_requires_existing_state", eventType: event.type });
      if (state.status !== "Prepared" && state.status !== "Assigned") {
        return err({ type: "event_not_applicable", eventType: event.type, status: state.status });
      }
      return ok({ ...state, status: "Cancelled" });
    }
  }
}
