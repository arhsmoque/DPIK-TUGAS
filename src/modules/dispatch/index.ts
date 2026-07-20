export type {
  CustodianType,
  Custodian,
  DispatchFacts,
  DispatchStatus,
  DispatchState
} from "./domain/dispatch";
export type {
  CreateDispatchAttempt,
  CreateReplacementDispatchAttempt,
  AssignDispatch,
  ConfirmPackageCollection,
  ReportPackageDelivery,
  ReportDeliveryFailure,
  CancelDispatchAttempt,
  DispatchCommand
} from "./domain/commands";
export type {
  DispatchAttemptCreated,
  ReplacementDispatchCreated,
  DispatchAssigned,
  PackageCollected,
  PackageDelivered,
  DeliveryFailed,
  DispatchCancelled,
  DispatchEvent
} from "./domain/events";
export type { DispatchDecisionFailure, DispatchEvolutionFailure } from "./domain/failures";
export { decide } from "./domain/decide";
export { evolve } from "./domain/evolve";
