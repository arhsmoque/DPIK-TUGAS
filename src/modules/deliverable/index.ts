export type {
  DeliverableFacts,
  DeliverableRevision,
  ReviewDecision,
  DeliverableStatus,
  DeliverableState
} from "./domain/deliverable";
export type {
  CreateDeliverable,
  SubmitRevision,
  ReviewOutcome,
  ReviewRevision,
  WithdrawDeliverable,
  DeliverableCommand
} from "./domain/commands";
export type {
  DeliverableCreated,
  RevisionSubmitted,
  RevisionApproved,
  RevisionRequired,
  RevisionRejected,
  DeliverableWithdrawn,
  DeliverableEvent
} from "./domain/events";
export type { DeliverableDecisionFailure, DeliverableEvolutionFailure } from "./domain/failures";
export { decide } from "./domain/decide";
export { evolve } from "./domain/evolve";
