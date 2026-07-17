import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "@foundation/result";
import { parseId } from "@foundation/ids";
import type { AuthenticatedIdentity } from "../../domain/authenticated-identity";
import type { AuthenticationFailure, IdentityProvider } from "../../ports/identity-provider";

export class SupabaseIdentityProvider implements IdentityProvider {
  public constructor(private readonly client: SupabaseClient) {}

  public async authenticate(
    accessToken: string
  ): Promise<Result<AuthenticatedIdentity, AuthenticationFailure>> {
    try {
      const { data, error } = await this.client.auth.getUser(accessToken);

      if (error || !data.user) {
        return err({ type: "unauthenticated" });
      }

      const identityId = parseId<"IdentityId">(data.user.id);
      if (!identityId.ok) {
        return err({ type: "unauthenticated" });
      }

      return ok({
        identityId: identityId.value,
        email: data.user.email ?? null
      });
    } catch {
      return err({ type: "identity_provider_unavailable" });
    }
  }
}
