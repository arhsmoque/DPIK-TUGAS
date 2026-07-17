import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseIdentityProvider } from "./supabase-identity-provider";

function clientReturning(result: unknown): SupabaseClient {
  return {
    auth: {
      getUser: async () => result
    }
  } as unknown as SupabaseClient;
}

describe("SupabaseIdentityProvider", () => {
  it("maps a server-verified Supabase user", async () => {
    const provider = new SupabaseIdentityProvider(
      clientReturning({
        data: {
          user: {
            id: "00000000-0000-4000-8000-000000000001",
            email: "user@dpik.test"
          }
        },
        error: null
      })
    );

    await expect(provider.authenticate("access-token")).resolves.toEqual({
      ok: true,
      value: {
        identityId: "00000000-0000-4000-8000-000000000001",
        email: "user@dpik.test"
      }
    });
  });

  it("fails closed for an invalid token or malformed provider identity", async () => {
    const invalidToken = new SupabaseIdentityProvider(
      clientReturning({ data: { user: null }, error: { message: "invalid JWT" } })
    );
    const malformedIdentity = new SupabaseIdentityProvider(
      clientReturning({ data: { user: { id: "not-a-uuid" } }, error: null })
    );

    await expect(invalidToken.authenticate("bad-token")).resolves.toEqual({
      ok: false,
      error: { type: "unauthenticated" }
    });
    await expect(malformedIdentity.authenticate("token")).resolves.toEqual({
      ok: false,
      error: { type: "unauthenticated" }
    });
  });

  it("distinguishes provider outage from rejected credentials", async () => {
    const client = {
      auth: {
        getUser: async () => {
          throw new Error("network unavailable");
        }
      }
    } as unknown as SupabaseClient;
    const provider = new SupabaseIdentityProvider(client);

    await expect(provider.authenticate("token")).resolves.toEqual({
      ok: false,
      error: { type: "identity_provider_unavailable" }
    });
  });
});
