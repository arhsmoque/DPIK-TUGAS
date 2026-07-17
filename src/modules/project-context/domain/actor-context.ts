import type { ActorId, IdentityId, OrganisationId, ProjectId } from "@foundation/ids";
import type { Permission } from "./permission";

export interface ActorContext {
  readonly identityId: IdentityId;
  readonly actorId: ActorId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly candidatePermissions: ReadonlySet<Permission>;
  readonly activeBundleCodes: ReadonlySet<string>;
}
