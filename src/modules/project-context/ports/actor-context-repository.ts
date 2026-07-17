import type { IdentityId, OrganisationId, ProjectId } from "@foundation/ids";
import type { OrganisationMembership, ProjectMembership } from "../domain/membership";
import type { RoleBundle, RoleBundleAssignment } from "../domain/role-bundle";

export interface ActorContextRepository {
  findOrganisationMembership(
    identityId: IdentityId,
    organisationId: OrganisationId
  ): Promise<OrganisationMembership | null>;
  findProjectMembership(
    identityId: IdentityId,
    organisationId: OrganisationId,
    projectId: ProjectId
  ): Promise<ProjectMembership | null>;
  findRoleAssignments(
    identityId: IdentityId,
    organisationId: OrganisationId,
    projectId: ProjectId
  ): Promise<readonly RoleBundleAssignment[]>;
  findRoleBundles(codes: ReadonlySet<string>): Promise<readonly RoleBundle[]>;
}
