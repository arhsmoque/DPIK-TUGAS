import { err, ok, type Result } from "@foundation/result";
import type {
  AssignDispatch,
  CancelDispatchAttempt,
  ConfirmPackageCollection,
  CreateDispatchAttempt,
  CreateReplacementDispatchAttempt,
  DispatchCommand,
  ReportDeliveryFailure,
  ReportPackageDelivery
} from "./commands";
import type { DispatchState } from "./dispatch";
import type { DispatchEvent } from "./events";
import type { DispatchDecisionFailure } from "./failures";

type Decision = Result<readonly DispatchEvent[], DispatchDecisionFailure>;

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function validateCreateFacts(command: {
  destination: string;
  recipientContact: string;
  packageSummary: string;
  createdAt: Date;
}): DispatchDecisionFailure | null {
  if (!hasText(command.destination)) return { type: "invalid_destination" };
  if (!hasText(command.recipientContact)) return { type: "invalid_recipient_contact" };
  if (!hasText(command.packageSummary)) return { type: "invalid_package_summary" };
  if (!isValidDate(command.createdAt)) return { type: "invalid_event_time" };
  return null;
}

function decideCreate(state: DispatchState | null, command: CreateDispatchAttempt): Decision {
  if (state !== null) return err({ type: "dispatch_already_exists" });
  const failure = validateCreateFacts(command);
  if (failure) return err(failure);

  return ok([
    {
      type: "DispatchAttemptCreated",
      dispatchAttemptId: command.dispatchAttemptId,
      submissionId: command.submissionId,
      organisationId: command.organisationId,
      projectId: command.projectId,
      destination: command.destination.trim(),
      recipientContact: command.recipientContact.trim(),
      packageSummary: command.packageSummary.trim(),
      replacesDispatchAttemptId: null,
      createdBy: command.createdBy,
      createdAt: command.createdAt
    }
  ]);
}

function decideCreateReplacement(
  state: DispatchState | null,
  command: CreateReplacementDispatchAttempt
): Decision {
  if (state !== null) return err({ type: "dispatch_already_exists" });
  const failure = validateCreateFacts(command);
  if (failure) return err(failure);

  return ok([
    {
      type: "ReplacementDispatchCreated",
      dispatchAttemptId: command.dispatchAttemptId,
      submissionId: command.submissionId,
      organisationId: command.organisationId,
      projectId: command.projectId,
      destination: command.destination.trim(),
      recipientContact: command.recipientContact.trim(),
      packageSummary: command.packageSummary.trim(),
      replacesDispatchAttemptId: command.replacesDispatchAttemptId,
      createdBy: command.createdBy,
      createdAt: command.createdAt
    }
  ]);
}

function decideAssign(state: DispatchState | null, command: AssignDispatch): Decision {
  if (state === null) return err({ type: "dispatch_not_found" });
  if (state.status !== "Prepared")
    return err({ type: "dispatch_not_prepared", status: state.status });
  if (!hasText(command.custodianName)) return err({ type: "invalid_custodian" });
  if (command.custodianType === "internal" && command.custodianActorId === null) {
    return err({ type: "invalid_custodian" });
  }
  if (!isValidDate(command.assignedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "DispatchAssigned",
      custodianType: command.custodianType,
      custodianActorId: command.custodianActorId,
      custodianName: command.custodianName.trim(),
      assignedBy: command.assignedBy,
      assignedAt: command.assignedAt
    }
  ]);
}

function decideConfirmCollection(
  state: DispatchState | null,
  command: ConfirmPackageCollection
): Decision {
  if (state === null) return err({ type: "dispatch_not_found" });
  if (state.status !== "Assigned")
    return err({ type: "dispatch_not_assigned", status: state.status });
  if (!isValidDate(command.confirmedAt)) return err({ type: "invalid_event_time" });

  return ok([
    { type: "PackageCollected", confirmedBy: command.confirmedBy, confirmedAt: command.confirmedAt }
  ]);
}

function decideReportDelivery(
  state: DispatchState | null,
  command: ReportPackageDelivery
): Decision {
  if (state === null) return err({ type: "dispatch_not_found" });
  if (state.status !== "InTransit") {
    return err({ type: "dispatch_not_in_transit", status: state.status });
  }
  if (!hasText(command.deliveredTo)) return err({ type: "invalid_delivered_to" });
  if (!isValidDate(command.reportedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "PackageDelivered",
      reportedBy: command.reportedBy,
      reportedAt: command.reportedAt,
      deliveredTo: command.deliveredTo.trim()
    }
  ]);
}

function decideReportFailure(
  state: DispatchState | null,
  command: ReportDeliveryFailure
): Decision {
  if (state === null) return err({ type: "dispatch_not_found" });
  if (state.status !== "Assigned" && state.status !== "InTransit") {
    return err({ type: "dispatch_not_failable", status: state.status });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.reportedAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "DeliveryFailed",
      reportedBy: command.reportedBy,
      reportedAt: command.reportedAt,
      reason: command.reason.trim()
    }
  ]);
}

function decideCancel(state: DispatchState | null, command: CancelDispatchAttempt): Decision {
  if (state === null) return err({ type: "dispatch_not_found" });
  if (state.status !== "Prepared" && state.status !== "Assigned") {
    return err({ type: "dispatch_not_cancellable", status: state.status });
  }
  if (!hasText(command.reason)) return err({ type: "invalid_reason" });
  if (!isValidDate(command.cancelledAt)) return err({ type: "invalid_event_time" });

  return ok([
    {
      type: "DispatchCancelled",
      cancelledBy: command.cancelledBy,
      cancelledAt: command.cancelledAt,
      reason: command.reason.trim()
    }
  ]);
}

export function decide(state: DispatchState | null, command: DispatchCommand): Decision {
  switch (command.type) {
    case "CreateDispatchAttempt":
      return decideCreate(state, command);
    case "CreateReplacementDispatchAttempt":
      return decideCreateReplacement(state, command);
    case "AssignDispatch":
      return decideAssign(state, command);
    case "ConfirmPackageCollection":
      return decideConfirmCollection(state, command);
    case "ReportPackageDelivery":
      return decideReportDelivery(state, command);
    case "ReportDeliveryFailure":
      return decideReportFailure(state, command);
    case "CancelDispatchAttempt":
      return decideCancel(state, command);
  }
}
