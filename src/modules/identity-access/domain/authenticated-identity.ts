import type { IdentityId } from "@foundation/ids";

export interface AuthenticatedIdentity {
  readonly identityId: IdentityId;
  readonly email: string | null;
}
