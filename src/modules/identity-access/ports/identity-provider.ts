import type { Result } from "@foundation/result";
import type { AuthenticatedIdentity } from "../domain/authenticated-identity";

export type AuthenticationFailure =
  { readonly type: "unauthenticated" } | { readonly type: "identity_provider_unavailable" };

export interface IdentityProvider {
  authenticate(accessToken: string): Promise<Result<AuthenticatedIdentity, AuthenticationFailure>>;
}
