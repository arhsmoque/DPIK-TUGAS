import { err, type Result } from "@foundation/result";
import type { AuthenticatedIdentity } from "../domain/authenticated-identity";
import type { AuthenticationFailure, IdentityProvider } from "../ports/identity-provider";

export async function authenticateIdentity(
  provider: IdentityProvider,
  accessToken: string
): Promise<Result<AuthenticatedIdentity, AuthenticationFailure>> {
  if (accessToken.trim().length === 0) {
    return err({ type: "unauthenticated" });
  }

  return provider.authenticate(accessToken);
}
