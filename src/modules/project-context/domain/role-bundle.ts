import type { IdentityId, OrganisationId, ProjectId } from "@foundation/ids";
import type { Permission } from "./permission";

export interface RoleBundle {
  readonly code: string;
  readonly permissions: ReadonlySet<Permission>;
}

export type AssignmentScope =
  | { readonly type: "organisation"; readonly organisationId: OrganisationId }
  | {
      readonly type: "project";
      readonly organisationId: OrganisationId;
      readonly projectId: ProjectId;
    };

export interface RoleBundleAssignment {
  readonly identityId: IdentityId;
  readonly bundleCode: string;
  readonly scope: AssignmentScope;
  readonly grantedBy: IdentityId;
  readonly grantedAt: Date;
  readonly basis: string;
  readonly revokedAt: Date | null;
}
