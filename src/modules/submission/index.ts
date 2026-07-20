export type {
  RecipientType,
  ManifestItem,
  DispatchApproval,
  SubmissionFacts,
  SubmissionStatus,
  SubmissionState
} from "./domain/submission";
export type {
  CreateSubmission,
  AddManifestItem,
  PrepareSubmission,
  ReturnSubmissionToDraft,
  ApproveSubmissionForDispatch,
  CancelSubmission,
  SupersedeSubmission,
  SubmissionCommand
} from "./domain/commands";
export type {
  SubmissionCreated,
  SubmissionManifestItemAdded,
  SubmissionPrepared,
  SubmissionReturnedToDraft,
  SubmissionApprovedForDispatch,
  SubmissionCancelled,
  SubmissionSuperseded,
  SubmissionEvent
} from "./domain/events";
export type { SubmissionDecisionFailure, SubmissionEvolutionFailure } from "./domain/failures";
export { decide } from "./domain/decide";
export { evolve } from "./domain/evolve";
