export { PERMISSIONS, type Permission } from "./domain/permission";
export type { OrganisationMembership, ProjectMembership } from "./domain/membership";
export { isActiveAt } from "./domain/membership";
export type { RoleBundle, RoleBundleAssignment, AssignmentScope } from "./domain/role-bundle";
export type { ActorContext } from "./domain/actor-context";
export type { ActorContextRepository } from "./ports/actor-context-repository";
export {
  resolveActorContext,
  type ActorContextFailure,
  type ResolveActorContextRequest
} from "./application/resolve-actor-context";
