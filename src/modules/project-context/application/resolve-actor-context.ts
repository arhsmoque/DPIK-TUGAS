import { brand, err, ok, type OrganisationId, type ProjectId } from "@foundation/index";
import type { Result } from "@foundation/result";
import type { AuthenticatedIdentity } from "@modules/identity-access";
import type { ActorContext } from "../domain/actor-context";
import { isActiveAt } from "../domain/membership";
import type { Permission } from "../domain/permission";
import type { RoleBundleAssignment } from "../domain/role-bundle";
import type { ActorContextRepository } from "../ports/actor-context-repository";

export type ActorContextFailure =
  | { readonly type: "organisation_access_denied" }
  | { readonly type: "project_access_denied" }
  | { readonly type: "permission_denied"; readonly permission: Permission }
  | { readonly type: "actor_context_unavailable" };

export interface ResolveActorContextRequest {
  readonly identity: AuthenticatedIdentity;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly requiredPermission?: Permission;
  readonly at: Date;
}

function assignmentApplies(
  assignment: RoleBundleAssignment,
  identityId: AuthenticatedIdentity["identityId"],
  organisationId: OrganisationId,
  projectId: ProjectId,
  at: Date
): boolean {
  if (assignment.identityId !== identityId) return false;
  if (assignment.scope.organisationId !== organisationId) return false;
  if (assignment.grantedAt.getTime() > at.getTime()) return false;
  if (assignment.revokedAt !== null && assignment.revokedAt.getTime() <= at.getTime()) return false;
  return assignment.scope.type === "organisation" || assignment.scope.projectId === projectId;
}

export async function resolveActorContext(
  repository: ActorContextRepository,
  request: ResolveActorContextRequest
): Promise<Result<ActorContext, ActorContextFailure>> {
  try {
    const organisationMembership = await repository.findOrganisationMembership(
      request.identity.identityId,
      request.organisationId
    );
    if (
      !organisationMembership ||
      organisationMembership.identityId !== request.identity.identityId ||
      organisationMembership.organisationId !== request.organisationId ||
      !isActiveAt(organisationMembership, request.at)
    ) {
      return err({ type: "organisation_access_denied" });
    }

    const projectMembership = await repository.findProjectMembership(
      request.identity.identityId,
      request.organisationId,
      request.projectId
    );
    if (
      !projectMembership ||
      projectMembership.identityId !== request.identity.identityId ||
      projectMembership.organisationId !== request.organisationId ||
      projectMembership.projectId !== request.projectId ||
      !isActiveAt(projectMembership, request.at)
    ) {
      return err({ type: "project_access_denied" });
    }

    const assignments = (
      await repository.findRoleAssignments(
        request.identity.identityId,
        request.organisationId,
        request.projectId
      )
    ).filter((assignment) =>
      assignmentApplies(
        assignment,
        request.identity.identityId,
        request.organisationId,
        request.projectId,
        request.at
      )
    );
    const activeBundleCodes = new Set(assignments.map((assignment) => assignment.bundleCode));
    const bundles = (await repository.findRoleBundles(activeBundleCodes)).filter((bundle) =>
      activeBundleCodes.has(bundle.code)
    );
    const candidatePermissions = new Set(bundles.flatMap((bundle) => [...bundle.permissions]));

    if (
      request.requiredPermission !== undefined &&
      !candidatePermissions.has(request.requiredPermission)
    ) {
      return err({ type: "permission_denied", permission: request.requiredPermission });
    }

    return ok({
      identityId: request.identity.identityId,
      actorId: brand<string, "ActorId">(request.identity.identityId),
      organisationId: request.organisationId,
      projectId: request.projectId,
      candidatePermissions,
      activeBundleCodes
    });
  } catch {
    return err({ type: "actor_context_unavailable" });
  }
}
