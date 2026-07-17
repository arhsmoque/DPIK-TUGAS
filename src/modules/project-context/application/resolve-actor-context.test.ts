import { describe, expect, it } from "vitest";
import { brand, type IdentityId, type OrganisationId, type ProjectId } from "@foundation/index";
import type { ActorContextRepository } from "../ports/actor-context-repository";
import type { OrganisationMembership, ProjectMembership } from "../domain/membership";
import type { RoleBundle, RoleBundleAssignment } from "../domain/role-bundle";
import { resolveActorContext } from "./resolve-actor-context";

const at = new Date("2026-07-17T00:00:00.000Z");
const identityId = brand<string, "IdentityId">(
  "00000000-0000-4000-8000-000000000001"
) as IdentityId;
const otherIdentityId = brand<string, "IdentityId">(
  "00000000-0000-4000-8000-000000000002"
) as IdentityId;
const organisationId = brand<string, "OrganisationId">(
  "00000000-0000-4000-8000-000000000010"
) as OrganisationId;
const projectId = brand<string, "ProjectId">("00000000-0000-4000-8000-000000000020") as ProjectId;
const otherProjectId = brand<string, "ProjectId">(
  "00000000-0000-4000-8000-000000000021"
) as ProjectId;

function fixture(
  overrides: {
    organisationMembership?: OrganisationMembership | null;
    projectMembership?: ProjectMembership | null;
    assignments?: readonly RoleBundleAssignment[];
    bundles?: readonly RoleBundle[];
  } = {}
): ActorContextRepository {
  return {
    findOrganisationMembership: async () =>
      overrides.organisationMembership === undefined
        ? { identityId, organisationId, activeFrom: new Date("2026-01-01"), revokedAt: null }
        : overrides.organisationMembership,
    findProjectMembership: async () =>
      overrides.projectMembership === undefined
        ? {
            identityId,
            organisationId,
            projectId,
            activeFrom: new Date("2026-01-01"),
            revokedAt: null
          }
        : overrides.projectMembership,
    findRoleAssignments: async () =>
      overrides.assignments ?? [
        {
          identityId,
          bundleCode: "work-owner",
          scope: { type: "project", organisationId, projectId },
          grantedBy: otherIdentityId,
          grantedAt: new Date("2026-01-01"),
          basis: "Project lead assignment",
          revokedAt: null
        },
        {
          identityId,
          bundleCode: "other-project",
          scope: { type: "project", organisationId, projectId: otherProjectId },
          grantedBy: otherIdentityId,
          grantedAt: new Date("2026-01-01"),
          basis: "Different Project",
          revokedAt: null
        }
      ],
    findRoleBundles: async (codes) =>
      (
        overrides.bundles ?? [
          { code: "work-owner", permissions: new Set(["work.create", "work.assign"]) },
          { code: "other-project", permissions: new Set(["claim.verify"]) }
        ]
      ).filter((bundle) => codes.has(bundle.code))
  };
}

const request = {
  identity: { identityId, email: "worker@dpik.test" },
  organisationId,
  projectId,
  requiredPermission: "work.create" as const,
  at
};

describe("resolveActorContext", () => {
  it("resolves active scope and only permissions from applicable assignments", async () => {
    const result = await resolveActorContext(fixture(), request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect([...result.value.activeBundleCodes]).toEqual(["work-owner"]);
      expect([...result.value.candidatePermissions]).toEqual(["work.create", "work.assign"]);
      expect(result.value.candidatePermissions.has("claim.verify")).toBe(false);
    }
  });

  it("denies missing organisation membership", async () => {
    await expect(
      resolveActorContext(fixture({ organisationMembership: null }), request)
    ).resolves.toEqual({ ok: false, error: { type: "organisation_access_denied" } });
  });

  it("denies revoked Project membership", async () => {
    await expect(
      resolveActorContext(
        fixture({
          projectMembership: {
            identityId,
            organisationId,
            projectId,
            activeFrom: new Date("2026-01-01"),
            revokedAt: new Date("2026-07-16")
          }
        }),
        request
      )
    ).resolves.toEqual({ ok: false, error: { type: "project_access_denied" } });
  });

  it("denies a membership record from another Project", async () => {
    await expect(
      resolveActorContext(
        fixture({
          projectMembership: {
            identityId,
            organisationId,
            projectId: otherProjectId,
            activeFrom: new Date("2026-01-01"),
            revokedAt: null
          }
        }),
        request
      )
    ).resolves.toEqual({ ok: false, error: { type: "project_access_denied" } });
  });

  it("denies a permission supplied only by another Project assignment", async () => {
    await expect(
      resolveActorContext(fixture(), { ...request, requiredPermission: "claim.verify" })
    ).resolves.toEqual({
      ok: false,
      error: { type: "permission_denied", permission: "claim.verify" }
    });
  });

  it("denies a revoked role assignment", async () => {
    const revokedAssignment: RoleBundleAssignment = {
      identityId,
      bundleCode: "work-owner",
      scope: { type: "project", organisationId, projectId },
      grantedBy: otherIdentityId,
      grantedAt: new Date("2026-01-01"),
      basis: "Revoked assignment fixture",
      revokedAt: new Date("2026-07-16")
    };

    await expect(
      resolveActorContext(fixture({ assignments: [revokedAssignment] }), request)
    ).resolves.toEqual({
      ok: false,
      error: { type: "permission_denied", permission: "work.create" }
    });
  });

  it("ignores assignments belonging to another identity", async () => {
    const mismatchedAssignment: RoleBundleAssignment = {
      identityId: otherIdentityId,
      bundleCode: "work-owner",
      scope: { type: "project", organisationId, projectId },
      grantedBy: otherIdentityId,
      grantedAt: new Date("2026-01-01"),
      basis: "Mismatched repository result",
      revokedAt: null
    };

    await expect(
      resolveActorContext(fixture({ assignments: [mismatchedAssignment] }), request)
    ).resolves.toEqual({
      ok: false,
      error: { type: "permission_denied", permission: "work.create" }
    });
  });

  it("fails closed when context persistence is unavailable", async () => {
    const unavailable = fixture();
    unavailable.findOrganisationMembership = async () => {
      throw new Error("database unavailable");
    };

    await expect(resolveActorContext(unavailable, request)).resolves.toEqual({
      ok: false,
      error: { type: "actor_context_unavailable" }
    });
  });
});
