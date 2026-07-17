import { describe, expect, it } from "vitest";
import { brand, err, ok, type IdentityId } from "@foundation/index";
import type { IdentityProvider } from "../ports/identity-provider";
import { authenticateIdentity } from "./authenticate";

const identityId = brand<string, "IdentityId">("00000000-0000-4000-8000-000000000001");

describe("authenticateIdentity", () => {
  it("returns verified provider identity", async () => {
    const provider: IdentityProvider = {
      authenticate: async () =>
        ok({ identityId: identityId as IdentityId, email: "user@dpik.test" })
    };

    await expect(authenticateIdentity(provider, "verified-token")).resolves.toEqual(
      ok({ identityId, email: "user@dpik.test" })
    );
  });

  it("rejects a blank bearer token without calling the provider", async () => {
    let called = false;
    const provider: IdentityProvider = {
      authenticate: async () => {
        called = true;
        return err({ type: "unauthenticated" });
      }
    };

    await expect(authenticateIdentity(provider, "  ")).resolves.toEqual(
      err({ type: "unauthenticated" })
    );
    expect(called).toBe(false);
  });
});
