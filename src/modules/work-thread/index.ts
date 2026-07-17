export type { WorkThreadFacts, Assignment, WorkThreadState } from "./domain/work-thread";
export type {
  CreateWorkThread,
  AssignWork,
  AcknowledgeAssignment,
  WorkThreadCommand
} from "./domain/commands";
export type {
  WorkThreadCreated,
  WorkAssigned,
  AssignmentAcknowledged,
  WorkThreadEvent
} from "./domain/events";
export type { WorkThreadDecisionFailure, WorkThreadEvolutionFailure } from "./domain/failures";
export { decide } from "./domain/decide";
export { evolve } from "./domain/evolve";
