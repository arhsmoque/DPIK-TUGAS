import type { IdentityId, OrganisationId, ProjectId } from "@foundation/ids";

interface ActivePeriod {
  readonly activeFrom: Date;
  readonly revokedAt: Date | null;
}

export interface OrganisationMembership extends ActivePeriod {
  readonly identityId: IdentityId;
  readonly organisationId: OrganisationId;
}

export interface ProjectMembership extends ActivePeriod {
  readonly identityId: IdentityId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
}

export function isActiveAt(period: ActivePeriod, at: Date): boolean {
  return (
    period.activeFrom.getTime() <= at.getTime() &&
    (period.revokedAt === null || period.revokedAt.getTime() > at.getTime())
  );
}
